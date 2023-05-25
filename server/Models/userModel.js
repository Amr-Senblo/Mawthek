// const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
  },
  email: {
    type: String,
    required: [true, 'please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'please provide a password'],
    select: false, // this means that i can't use password an output any where
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

  photo: {
    type: String,
    defalut: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
  },
  // address: { type: String, required: true },
  isAdmin: { type: Boolean, defalut: false },

  saved: [
    {
      bookId: {
        // type:ObjectId
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        // required: true,
      },
      // quantity: {
      //   type: Number,
      //   required: true,
      //   default: 1,
      // },
    },
  ],

  // orders: [
  //   {
  //     book: { type: Schema.Types.ObjectId, ref: "Book", required: true },
  //     quantity: { type: Number, required: true },
  //     date: { type: Date, required: true },
  //   },
  // ],
});

userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 10
  this.password = await bcrypt.hash(this.password, 10);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.isCorrectPassword = async function (
  enteredPassword,
  hashedUserPassword
) {
  return await bcrypt.compare(enteredPassword, hashedUserPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken });
  console.log('Hashed Reset Token :', this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //will be expired after 10 min

  return resetToken; // will return the plain token NOT HASHED
};

const User = mongoose.model('User', userSchema);

module.exports = User;
