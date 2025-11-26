import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";

const generateToken = (payload: any, secret: Secret, expiresIn: string) => {
    // console.log("🟢 GENERATE TOKEN CALLED");
    // console.log("🟡 SIGN SECRET:", secret);

    const token = jwt.sign(payload, secret, {
        algorithm: "HS256",
        expiresIn
    } as SignOptions
    );

    // console.log("🔑 GENERATED TOKEN:", token);
    console.log("Token generated:", token);
    console.log("Using secret:", secret);

    return token;
}

const verifyToken = (token: string, secret: Secret) => {
    // console.log("🔍 VERIFY FUNCTION CALLED");
    // console.log("🔑 TOKEN RECEIVED:", token);
    // console.log("🔐 SECRET USED FOR VERIFY:", secret);

    console.log("Token to verify:", token);
    console.log("Secret for verify:", secret);

    return jwt.verify(token, secret) as JwtPayload
}

export const jwtHelpers = {
    generateToken,
    verifyToken
}