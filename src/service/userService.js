import prisma from '../database/prisma.js';


class UserService {
  async findByEmail(email) {
    try {
      const user = await prisma.users.findUnique({
        where: { email }
      });
      return user;
    } catch (error) {
      return null;
    }
  }

  async createUser(userData) {
    try {
      const newUser = await prisma.users.create({
        data: {
          email: userData.email,
          avatar: userData.avatar
        }
      });
      return newUser;

    } catch (error) {
      throw error;
    }
  }

  async updateUser(email, updateData) {
    try {
      const updatedUser = await prisma.users.update({
        where: { email },
        data: updateData
      });

      return updatedUser;

    } catch (error) {
      throw error;
    }
  }

  async getOrCreateUser(googleUserData) {
    try {
      const { email, picture } = googleUserData;

      let user = await this.findByEmail(email);

      if (user) {
        if (picture && user.avatar !== picture) {
          user = await this.updateUser(email, {
            avatar: picture
          });
        }
      } else {
        user = await this.createUser({
          email: email,
          avatar: picture
        });
      }

      return user;

    } catch (error) {
      throw error;
    }
  }
}

// Tạo instance singleton
const userService = new UserService();

export default userService;
