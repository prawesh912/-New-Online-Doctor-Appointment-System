import ROLES from "../constants/roles.js";

export const verifyOwnershipOrAdmin = (req, res, next) => {
    const userIdFromToken = req.user.userId;
    const userRole = req.user.role;
    const targetUserId = Number(req.params.id);

    if (!targetUserId) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID"
        });
    }

    // Admin can access anything
    if (userRole === ROLES.ADMIN) {
        return next();
    }

    // User can only access own data
    if (userIdFromToken !== targetUserId) {
        return res.status(403).json({
            success: false,
            message: "Forbidden: You can only access your own profile"
        });
    }

    next();
};