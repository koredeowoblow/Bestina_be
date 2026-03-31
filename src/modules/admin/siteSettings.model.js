import mongoose from "mongoose";

const siteSettingsSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: "Bestina Medical Wear" },
    contactEmail: { type: String },
    supportPhone: { type: String },
    orderCutoffTime: { type: String },
    freeShippingThresholdKobo: { type: Number, default: 0 },
    enablePaystack: { type: Boolean, default: true },
    enableStripe: { type: Boolean, default: false },
    notifyNewOrders: { type: Boolean, default: true },
    notifyLowStock: { type: Boolean, default: true },
    notifyNewUsers: { type: Boolean, default: false },
    notificationRecipients: [{ type: String }],
  },
  { timestamps: true },
);

siteSettingsSchema.statics.getOrCreate = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model("SiteSettings", siteSettingsSchema);
