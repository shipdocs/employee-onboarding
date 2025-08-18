// User repository for user-specific database operations
const BaseRepository = require('./baseRepository');
const bcrypt = require('bcrypt');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  // Find user by email
  async findByEmail(email) {
    return this.findOne({ email });
  }

  // Find users by role
  async findByRole(role, options = {}) {
    return this.findAll({ role }, options);
  }

  // Get managers with permissions
  async getManagersWithPermissions() {
    const managers = await this.findByRole('manager', {
      select: `
        id,
        email,
        first_name,
        last_name,
        position,
        preferred_language,
        status,
        is_active,
        created_at,
        updated_at
      `,
      orderBy: 'created_at',
      ascending: false
    });

    if (!managers || managers.length === 0) return [];

    // Get permissions for all managers
    const managerIds = managers.map(m => m.id);
    const { data: permissions, error } = await this.supabase
      .from('manager_permissions')
      .select('*')
      .in('manager_id', managerIds);

    if (error) {
      console.error('Error fetching permissions:', error);
    }

    // Combine managers with their permissions
    return managers.map(manager => ({
      ...manager,
      permissions: permissions?.filter(p => p.manager_id === manager.id) || []
    }));
  }

  // Create user with hashed password
  async createWithPassword(userData) {
    const { password, ...userInfo } = userData;
    
    if (password) {
      userInfo.password_hash = await bcrypt.hash(password, 10);
    }

    return this.create(userInfo);
  }

  // Verify user password
  async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user || !user.password_hash) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    // Remove password hash from returned user
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Get user statistics by role
  async getStatsByRole() {
    const stats = {
      totalAdmins: await this.count({ role: 'admin' }),
      totalManagers: await this.count({ role: 'manager' }),
      totalCrew: await this.count({ role: 'crew' }),
      totalActive: await this.count({ is_active: true })
    };

    return stats;
  }

  // Update last login
  async updateLastLogin(userId) {
    return this.update(userId, {
      last_login: new Date().toISOString()
    });
  }

  // Soft delete user (set is_active to false)
  async softDelete(userId) {
    return this.update(userId, {
      is_active: false,
      deleted_at: new Date().toISOString()
    });
  }
}

module.exports = new UserRepository();