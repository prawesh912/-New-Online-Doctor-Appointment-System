import jwt from "jsonwebtoken";

export const verifyJWT = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: No token provided"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded; // { userId, role }

        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            message: "Token is invalid or expired"
        });
    }
};