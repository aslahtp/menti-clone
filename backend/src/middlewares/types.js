const { z } = require("zod");

const signupSchema = z.object({
    name: z.string().min(3),
    email: z.email(),
    password: z.string().min(6),
    role: z.enum(["USER", "ADMIN"]).optional(),
});

const signinSchema = z.object({
    //email: z.email(),
    password: z.string().min(6),
});

module.exports = {
    signupSchema,
    signinSchema,
};
