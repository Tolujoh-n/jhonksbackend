const mongoose = require("mongoose");
const User = require("./src/models/User");
const Material = require("./src/models/Material");
require("dotenv").config({ path: "./config.env" });

const materials = [
  {
    name: "Plastic Bottles",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    pricePerKg: 150,
    category: "household_wastes",
    description: "Clean plastic bottles for recycling",
    excemptions: ["Dirty bottles", "Bottles with labels"],
  },
  {
    name: "Aluminum Cans",
    image: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400",
    pricePerKg: 200,
    category: "household_wastes",
    description: "Aluminum beverage cans",
    excemptions: ["Dented cans", "Cans with paint"],
  },
  {
    name: "Cardboard",
    image: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=400",
    pricePerKg: 80,
    category: "household_wastes",
    description: "Clean cardboard boxes and paper",
    excemptions: ["Wet cardboard", "Greasy cardboard"],
  },
  {
    name: "Glass Bottles",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    pricePerKg: 120,
    category: "household_wastes",
    description: "Clear and colored glass bottles",
    excemptions: ["Broken glass", "Light bulbs"],
  },
  {
    name: "Industrial Steel",
    image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400",
    pricePerKg: 300,
    category: "industrial_waste",
    description: "Industrial steel scrap",
    excemptions: ["Rusted steel", "Painted steel"],
  },
  {
    name: "Copper Wire",
    image: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=400",
    pricePerKg: 800,
    category: "industrial_waste",
    description: "Clean copper wire scrap",
    excemptions: ["Insulated wire", "Coated wire"],
  },
  {
    name: "Iron Scrap",
    image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400",
    pricePerKg: 250,
    category: "industrial_waste",
    description: "Iron and steel scrap metal",
    excemptions: ["Rusted iron", "Mixed metals"],
  },
  {
    name: "Raw Cotton",
    image: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=400",
    pricePerKg: 400,
    category: "raw_materials",
    description: "Clean raw cotton fibers",
    excemptions: ["Dirty cotton", "Processed cotton"],
  },
  {
    name: "Wood Chips",
    image: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=400",
    pricePerKg: 100,
    category: "raw_materials",
    description: "Clean wood chips and sawdust",
    excemptions: ["Treated wood", "Painted wood"],
  },
  {
    name: "Paper Waste",
    image: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=400",
    pricePerKg: 60,
    category: "raw_materials",
    description: "Clean paper waste for recycling",
    excemptions: ["Wet paper", "Glossy paper"],
  },
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jhonks-demo-db"
    );
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Material.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // Create admin user
    const adminUser = await User.create({
      username: "admin",
      email: "admin@jhonks.com",
      firstName: "Admin",
      lastName: "User",
      homeAddress: "123 Admin Street",
      state: "Lagos",
      phoneNumber: "08012345678",
      password: "admin123",
      role: "admin",
    });
    console.log("👤 Created admin user:", adminUser.email);

    // Create materials
    const createdMaterials = await Material.insertMany(materials);
    console.log(`📦 Created ${createdMaterials.length} materials`);

    console.log("✅ Database seeded successfully!");
    console.log("🔑 Admin credentials:");
    console.log("   Email: admin@jhonks.com");
    console.log("   Password: admin123");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

seedDatabase();
