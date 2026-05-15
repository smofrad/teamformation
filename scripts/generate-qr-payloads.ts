const examples = [
  {
    name: "Anna Svensson",
    title: "CFO",
    email: "anna@company.se",
  },
  {
    name: "Johan Lindberg",
    title: "Procurement Director",
    email: "johan@northwind.se",
  },
  {
    name: "Maria Ek",
    title: "Finance Systems Lead",
    email: "maria@acme.se",
  },
];

for (const attendee of examples) {
  console.log("JSON");
  console.log(JSON.stringify(attendee));
  console.log("");
  console.log("PLAIN TEXT");
  console.log(`NAME:${attendee.name}`);
  console.log(`TITLE:${attendee.title}`);
  console.log(`EMAIL:${attendee.email}`);
  console.log("\n---\n");
}
