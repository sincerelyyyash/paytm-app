
import db from "@repo/db/client";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcryptjs';
import { z } from 'zod';

interface Credentials {
  phone: string;
  password: string;
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        phone: { label: "Phone number", type: "text", placeholder: "1231231231", required: true },
        password: { label: "Password", type: "password", required: true }
      },
      async authorize(credentials: Record<"phone" | "password", string> | undefined) {
        if (!credentials) {
          return null;
        }

        const credentialsSchema = z.object({
          phone: z.string().min(10).max(15),
          password: z.string().min(6),
        });

        try {
          credentialsSchema.parse(credentials);
        } catch (e) {
          return null;
        }

        const existingUser = await db.user.findFirst({
          where: {
            number: credentials.phone
          }
        });

        if (existingUser) {
          const passwordValidation = await bcrypt.compare(credentials.password, existingUser.password);
          if (passwordValidation) {
            return {
              id: existingUser.id.toString(),
              name: existingUser.name,
              email: existingUser.number
            };
          }
          return null;
        }

        const hashedPassword = await bcrypt.hash(credentials.password, 10);

        try {
          const user = await db.user.create({
            data: {
              number: credentials.phone,
              password: hashedPassword
            }
          });

          return {
            id: user.id.toString(),
            name: user.name,
            email: user.number
          };
        } catch (e) {
          console.error(e);
        }

        return null;
      },
    })
  ],
  secret: process.env.JWT_SECRET || "secret",
  callbacks: {
    async session({ token, session }: { token: any; session: any }) {
      session.user.id = token.sub;
      return session;
    }
  }
}

