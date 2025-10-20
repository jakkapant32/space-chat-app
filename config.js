require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://company_admin:oZgkPkO1hZDuuJvDoTTnhoKN6gfyILhx@dpg-d3hhrlvfte5s73cvb3dg-a.oregon-postgres.render.com/companydb_y6dv',
  sessionSecret: process.env.SESSION_SECRET || 'chat-app-secret-key-change-in-production'
};

