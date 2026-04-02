const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const User = require('../models/User');

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find or create user
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Create new user if doesn't exist
          user = new User({
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            username: profile.displayName?.toLowerCase().replace(/\s+/g, '_') || `user_${profile.id}`,
            displayName: profile.displayName,
            avatar: profile.photos?.[0]?.value,
            isVerified: true, // OAuth users are pre-verified
          });
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Apple OAuth Strategy
passport.use(
  'apple',
  new AppleStrategy(
    {
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyString: process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      callbackURL: process.env.APPLE_CALLBACK_URL || '/api/auth/apple/callback',
    },
    async (accessToken, refreshToken, idToken, profile, done) => {
      try {
        // Find or create user
        let user = await User.findOne({ appleId: profile.id });

        if (!user) {
          // Create new user if doesn't exist
          const email = profile.email || `apple_${profile.id}@appleid.com`;
          const username = profile.name?.firstName?.toLowerCase() || `user_${profile.id}`;

          user = new User({
            appleId: profile.id,
            email,
            username,
            displayName: `${profile.name?.firstName || ''} ${profile.name?.lastName || ''}`.trim(),
            isVerified: true, // OAuth users are pre-verified
          });
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
