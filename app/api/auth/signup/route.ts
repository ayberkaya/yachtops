import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-server";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  yachtName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = signUpSchema.parse(body);

    // Check if user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Create yacht first
    const yacht = await db.yacht.create({
      data: {
        name: validated.yachtName,
        flag: "",
        length: null,
        registrationNumber: null,
        notes: null,
      },
    });

    // Hash password
    const passwordHash = await hashPassword(validated.password);
    const username = validated.email.split("@")[0];

    // Create owner user
    const user = await db.user.create({
      data: {
        email: validated.email,
        username,
        passwordHash,
        name: validated.name,
        role: UserRole.OWNER,
        yachtId: yacht.id,
        permissions: JSON.stringify([
          "expenses.view",
          "expenses.create",
          "expenses.approve",
          "expenses.edit",
          "expenses.delete",
          "trips.view",
          "trips.create",
          "trips.edit",
          "trips.delete",
          "tasks.view",
          "tasks.create",
          "tasks.edit",
          "tasks.delete",
          "users.view",
          "users.create",
          "users.edit",
          "users.delete",
          "documents.view",
          "documents.create",
          "documents.edit",
          "documents.delete",
          "shopping.view",
          "shopping.create",
          "shopping.edit",
          "shopping.delete",
          "inventory.view",
          "inventory.create",
          "inventory.edit",
          "inventory.delete",
          "maintenance.view",
          "maintenance.create",
          "maintenance.edit",
          "maintenance.delete",
          "messages.view",
          "messages.create",
          "messages.edit",
          "messages.delete",
          "performance.view",
        ]),
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        yachtId: true,
        createdAt: true,
      },
    });

    // Create default expense categories
    const defaultCategories = [
      "Fuel",
      "Marina & Port Fees",
      "Provisions",
      "Cleaning & Laundry",
      "Maintenance & Repairs",
      "Crew",
      "Tender & Toys",
      "Miscellaneous",
    ];

    await Promise.all(
      defaultCategories.map((categoryName) =>
        db.expenseCategory.create({
          data: {
            name: categoryName,
            yachtId: yacht.id,
          },
        })
      )
    );

    // Create general message channel (only if it doesn't exist)
    const existingGeneralChannel = await db.messageChannel.findFirst({
      where: {
        yachtId: yacht.id,
        name: "General",
      },
    });

    if (!existingGeneralChannel) {
      await db.messageChannel.create({
        data: {
          yachtId: yacht.id,
          name: "General",
          description: "General discussion channel for all crew members",
          isGeneral: true,
          createdByUserId: user.id,
          members: {
            connect: { id: user.id },
          },
        },
      });
    }

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

