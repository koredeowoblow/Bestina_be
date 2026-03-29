import Order from '../orders/order.model.js';
import User from '../auth/auth.model.js';
import Product from '../products/product.model.js';
// Assuming a Settings model exists or is stored in Redis/static
// Skipping Settings model logic for brevity here

class AdminService {
  async getDashboardStats(timeframe = 'today') {
    // Determine date range based on timeframe (e.g. 'today', 'week', 'month')
    const now = new Date();
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (timeframe === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    }

    // 1. Revenue & Orders Count Aggregation
    const revenueAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    const stats = revenueAgg[0] || { totalRevenue: 0, orderCount: 0 };

    // 2. New Users Count
    stats.newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });

    // 3. Low Stock Products Count (< 10 items)
    stats.lowStockProducts = await Product.countDocuments({ stock: { $lt: 10 }, isArchived: false });

    return stats;
  }

  async getAllUsers(query) {
    const filter = {};
    if (query.role) filter.role = query.role;
    // Assuming boolean status like isActive exists on User, otherwise skipping
    
    // Manual pagination since we didn't add the plugin to User model previously
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).lean(),
      User.countDocuments(filter)
    ]);

    return { users, total, page, limit };
  }

  async suspendUser(userId, suspendState) {
    // Assuming isActive flag on User model
    return await User.findByIdAndUpdate(userId, { isActive: !suspendState }, { new: true });
  }
}

export default new AdminService();
