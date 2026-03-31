class UsersRepository {
  constructor({ UserModel }) {
    if (!UserModel) {
      throw new Error("UsersRepository requires UserModel");
    }

    this.model = UserModel;
  }

  async findById(userId) {
    return this.model.findById(userId);
  }

  async findByIdWithAddresses(userId) {
    return this.model.findById(userId).select("addresses");
  }

  async updateById(userId, updateData) {
    return this.model.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });
  }
}

export default UsersRepository;
