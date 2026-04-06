import jwt from 'jsonwebtoken';

export const verifyJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader?.startsWith("Bearer ")) return res.sendStatus(401);

        const token = authHeader.split(" ")[1];

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) return res.status(403).json({ message: "Token is invalid or expired" });

            // ✅ Assign the decoded payload to request object
            req.user = decoded;

            next(); // ✅ Call next INSIDE the verify callback
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};