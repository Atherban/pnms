const LEGACY_ROLE_MAP = {
  VIEWER: "CUSTOMER",
  ADMIN: "NURSERY_ADMIN"
};

const normalizeRole = (role) => LEGACY_ROLE_MAP[role] || role;

const expandAllowedRoles = (roles) => roles;

module.exports = {
  normalizeRole,
  expandAllowedRoles
};
