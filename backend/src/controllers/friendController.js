const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// POST /api/users/:id/friend-request
const sendRequest = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const me = req.user._id;

    if (targetId === me.toString()) {
      return next(new ApiError(400, 'Cannot send a friend request to yourself'));
    }

    const target = await User.findById(targetId);
    if (!target) return next(new ApiError(404, 'User not found'));

    if (target.blockedUsers.some(id => id.toString() === me.toString())) {
      return next(new ApiError(403, 'Cannot send request to this user'));
    }

    const alreadyFriends = target.friends.some(id => id.toString() === me.toString());
    if (alreadyFriends) {
      return next(new ApiError(400, 'Already friends'));
    }

    const alreadyRequested = target.friendRequests.some(r => r.from.toString() === me.toString());
    if (alreadyRequested) {
      return next(new ApiError(400, 'Friend request already sent'));
    }

    // If target already sent us a request → auto-accept (mutual)
    const myDoc = await User.findById(me);
    const mutualIdx = myDoc.friendRequests.findIndex(r => r.from.toString() === targetId);
    if (mutualIdx !== -1) {
      myDoc.friendRequests.splice(mutualIdx, 1);
      myDoc.friends.addToSet(targetId);
      target.friends.addToSet(me);
      await Promise.all([myDoc.save(), target.save()]);

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${targetId}`).emit('friend:accepted', { userId: me });
        io.to(`user:${me.toString()}`).emit('friend:accepted', { userId: targetId });
      }

      return res.status(200).json({ success: true, message: 'Friend request accepted (mutual)' });
    }

    target.friendRequests.push({ from: me });
    await target.save();

    const io = req.app.get('io');
    if (io) {
      const sender = await User.findById(me).select('username displayName avatar');
      io.to(`user:${targetId}`).emit('friend:request', {
        from: { _id: me, username: sender.username, displayName: sender.displayName, avatar: sender.avatar },
      });
    }

    res.status(200).json({ success: true, message: 'Friend request sent' });
  } catch (err) {
    next(err);
  }
};

// POST /api/users/friend-request/:id/accept  (id = requesterId)
const acceptRequest = async (req, res, next) => {
  try {
    const requesterId = req.params.id;
    const me = req.user._id;

    const myDoc = await User.findById(me);
    const idx = myDoc.friendRequests.findIndex(r => r.from.toString() === requesterId);
    if (idx === -1) return next(new ApiError(404, 'No pending request from this user'));

    myDoc.friendRequests.splice(idx, 1);
    myDoc.friends.addToSet(requesterId);
    await myDoc.save();

    await User.findByIdAndUpdate(requesterId, { $addToSet: { friends: me } });

    const io = req.app.get('io');
    if (io) {
      const accepter = await User.findById(me).select('username displayName avatar');
      io.to(`user:${requesterId}`).emit('friend:accepted', {
        user: { _id: me, username: accepter.username, displayName: accepter.displayName, avatar: accepter.avatar },
      });
    }

    res.status(200).json({ success: true, message: 'Friend request accepted' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/friend-request/:id  (id = requesterId — decline)
const declineRequest = async (req, res, next) => {
  try {
    const requesterId = req.params.id;
    const me = req.user._id;

    await User.findByIdAndUpdate(me, {
      $pull: { friendRequests: { from: requesterId } },
    });

    res.status(200).json({ success: true, message: 'Friend request declined' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/:id/friend
const removeFriend = async (req, res, next) => {
  try {
    const friendId = req.params.id;
    const me = req.user._id;

    await Promise.all([
      User.findByIdAndUpdate(me, { $pull: { friends: friendId } }),
      User.findByIdAndUpdate(friendId, { $pull: { friends: me } }),
    ]);

    res.status(200).json({ success: true, message: 'Friend removed' });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/friends
const getFriends = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id)
      .select('friends')
      .populate('friends', 'username displayName avatar status');
    res.status(200).json({ success: true, data: { friends: me.friends } });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/friend-requests
const getFriendRequests = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id)
      .select('friendRequests')
      .populate('friendRequests.from', 'username displayName avatar');
    res.status(200).json({ success: true, data: { friendRequests: me.friendRequests } });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendRequest, acceptRequest, declineRequest, removeFriend, getFriends, getFriendRequests };
