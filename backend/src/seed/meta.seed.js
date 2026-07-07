import mongoose from "mongoose";
import dotenv from "dotenv";

import CompanyDirectory from "../models/meta/CompanyDirectory.js";
import CollegeDirectory from "../models/meta/CollegeDirectory.js";
import LocationDirectory from "../models/meta/LocationDirectory.js";
import SkillDirectory from "../models/meta/SkillDirectory.js";

dotenv.config();

const companies = [
  "Reliance Industries",
  "Jio",
  "Reliance Retail",
  "Tata Group",
  "TCS",
  "Tata Motors",
  "Tata Steel",
  "Infosys",
  "Wipro",
  "HCLTech",
  "Tech Mahindra",
  "Larsen & Toubro",
  "Adani Group",
  "Mahindra Group",
  "Maruti Suzuki",
  "Bajaj Auto",
  "Hero MotoCorp",
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Paytm",
  "PhonePe",
  "Google India",
  "Microsoft India",
  "Amazon India",
  "Apple India",
  "Meta India",
  "Netflix India",
  "Uber India",
  "Ola",
  "Rapido",
  "Zomato",
  "Swiggy",
  "Blinkit",
  "Zepto",
  "Flipkart",
  "Myntra",
  "Meesho",
  "BigBasket",
  "Nykaa",
  "CRED",
  "Groww",
  "Zerodha",
  "MakeMyTrip",
  "EaseMyTrip",
  "Ixigo",
  "OYO",
  "Taj Hotels",
  "Oberoi Hotels",
  "ITC Hotels",
  "Lemon Tree Hotels",
  "RedCarmine Hotels",
  "Local Business",
  "Self Employed",
  "Own Business",
];

const colleges = [
  "Indian Institute of Technology Delhi",
  "Indian Institute of Technology Bombay",
  "Indian Institute of Technology Madras",
  "Indian Institute of Technology Kanpur",
  "Indian Institute of Technology Kharagpur",
  "Indian Institute of Technology Roorkee",
  "Indian Institute of Technology Guwahati",
  "Indian Institute of Technology Hyderabad",
  "Indian Institute of Technology Patna",
  "National Institute of Technology Trichy",
  "National Institute of Technology Warangal",
  "National Institute of Technology Surathkal",
  "Delhi University",
  "Jawaharlal Nehru University",
  "Jamia Millia Islamia",
  "Banaras Hindu University",
  "Aligarh Muslim University",
  "University of Mumbai",
  "University of Calcutta",
  "University of Madras",
  "Christ University",
  "Amity University",
  "Lovely Professional University",
  "Chandigarh University",
  "Manipal University",
  "VIT Vellore",
  "SRM University",
  "BITS Pilani",
  "Shiv Nadar University",
  "Ashoka University",
];

const locations = [
  ["Delhi", "Delhi"],
  ["New Delhi", "Delhi"],
  ["Badarpur", "Delhi"],
  ["Noida", "Uttar Pradesh"],
  ["Greater Noida", "Uttar Pradesh"],
  ["Ghaziabad", "Uttar Pradesh"],
  ["Gurugram", "Haryana"],
  ["Faridabad", "Haryana"],
  ["Mumbai", "Maharashtra"],
  ["Pune", "Maharashtra"],
  ["Bengaluru", "Karnataka"],
  ["Hyderabad", "Telangana"],
  ["Chennai", "Tamil Nadu"],
  ["Kolkata", "West Bengal"],
  ["Ahmedabad", "Gujarat"],
  ["Surat", "Gujarat"],
  ["Jaipur", "Rajasthan"],
  ["Lucknow", "Uttar Pradesh"],
  ["Kanpur", "Uttar Pradesh"],
  ["Varanasi", "Uttar Pradesh"],
  ["Patna", "Bihar"],
  ["Bihar Sharif", "Bihar"],
  ["Ranchi", "Jharkhand"],
  ["Indore", "Madhya Pradesh"],
  ["Bhopal", "Madhya Pradesh"],
];

const skills = [
  "Communication",
  "Sales",
  "Customer Handling",
  "Hotel Management",
  "Computer Basics",
  "Excel",
  "Graphic Design",
  "Video Editing",
  "Marketing",
  "React",
  "Node.js",
  "MongoDB",
  "JavaScript",
  "UI Design",
  "Business Development",
  "Content Creation",
  "Accounting",
  "Leadership",
  "English Speaking",
  "Team Management",
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await CompanyDirectory.deleteMany({});
    await CollegeDirectory.deleteMany({});
    await LocationDirectory.deleteMany({});
    await SkillDirectory.deleteMany({});

    await CompanyDirectory.insertMany(
      companies.map((name, index) => ({
        name,
        type: "Company",
        country: "India",
        priority: companies.length - index,
        searchText: name.toLowerCase(),
        isActive: true,
      }))
    );

    await CollegeDirectory.insertMany(
      colleges.map((name, index) => ({
        name,
        type: "College",
        country: "India",
        priority: colleges.length - index,
        searchText: name.toLowerCase(),
        isActive: true,
      }))
    );

    await LocationDirectory.insertMany(
      locations.map(([name, state], index) => ({
        name,
        state,
        country: "India",
        type: "City",
        priority: locations.length - index,
        searchText: `${name} ${state} India`.toLowerCase(),
        isActive: true,
      }))
    );

    await SkillDirectory.insertMany(
      skills.map((name, index) => ({
        name,
        category: "General",
        priority: skills.length - index,
        searchText: name.toLowerCase(),
        isActive: true,
      }))
    );

    console.log("Meta data seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Meta seed failed:", error);
    process.exit(1);
  }
};

seed();