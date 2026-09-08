import { prisma } from "./lib/prisma";

async function main() {
  // Create a new user with a post
  // const user = await prisma.user.create({
  //   data: {
  //     name: "Atiq",
  //     email: "atiq22@prisma.io",
  //   },
  // });
  // console.log("Created user:", user);

  // // Fetch all users with their posts
  // const allUsers = await prisma.user.findMany({
  //   where: { email: "atiq22@prisma.io" },
  // });
  // console.log("All users:", JSON.stringify(allUsers, null, 2));
  await prisma.$connect();
  console.log("Connected to the database successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
