import mongoose from "mongoose";
import bcrypt from "bcrypt";

const isCloudinaryUrl = (value) =>
  typeof value === "string" && value.startsWith("https://res.cloudinary.com");

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  zipCode: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please tell us your name!"],
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin", "super_admin"],
      default: "user",
    },
    photo: {
      url: {
        type: String,
        default:
          "https://res.cloudinary.com/default/image/upload/v1/avatar.png",
        validate: {
          validator: isCloudinaryUrl,
          message: "Photo URL must start with https://res.cloudinary.com",
        },
      },
      publicId: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    addresses: {
      type: [addressSchema],
      validate: [(val) => val.length <= 10, "{PATH} exceeds the limit of 10"],
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true },
);

// Global transformation for JSON response to simplify photo
userSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    if (ret.photo && ret.photo.url) {
      ret.photo = ret.photo.url;
    }
    delete ret.password;
    return ret;
  },
});

userSchema.set("toObject", { virtuals: true });

// Pre-save hook to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model("User", userSchema);
export default User;
