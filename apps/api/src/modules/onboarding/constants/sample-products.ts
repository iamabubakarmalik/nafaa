export interface SampleProduct {
  name: string;
  price: number;
  costPrice: number;
  stock: number;
  unit: string;
  category: string;
  barcode?: string;
}

export const SAMPLE_PRODUCTS: Record<string, SampleProduct[]> = {
  GROCERY: [
    { name: 'Sufi Cooking Oil 5L', price: 2650, costPrice: 2450, stock: 20, unit: 'pcs', category: 'Oil/Ghee' },
    { name: 'Basmati Rice 1kg', price: 380, costPrice: 320, stock: 50, unit: 'kg', category: 'Atta/Rice/Daal' },
    { name: 'Tapal Danedar Tea 475g', price: 850, costPrice: 780, stock: 30, unit: 'pcs', category: 'Cheeni & Chai' },
    { name: 'National Salt 800g', price: 120, costPrice: 100, stock: 40, unit: 'pcs', category: 'Spices/Masala' },
    { name: 'Nestle Milk Pack 1L', price: 320, costPrice: 290, stock: 30, unit: 'liter', category: 'Dairy' },
    { name: 'LU Prince Biscuit', price: 60, costPrice: 50, stock: 100, unit: 'pcs', category: 'Biscuits' },
    { name: 'Coca Cola 1.5L', price: 220, costPrice: 190, stock: 40, unit: 'pcs', category: 'Beverages' },
    { name: 'Surf Excel 500g', price: 480, costPrice: 420, stock: 25, unit: 'pcs', category: 'Cleaning' },
  ],

  MOBILE: [
    { name: 'Samsung A15 128GB', price: 55000, costPrice: 50000, stock: 5, unit: 'pcs', category: 'Phones' },
    { name: 'Infinix Hot 40i', price: 32000, costPrice: 28000, stock: 8, unit: 'pcs', category: 'Phones' },
    { name: 'Anker PowerCore 10000', price: 4500, costPrice: 3800, stock: 15, unit: 'pcs', category: 'Chargers' },
    { name: 'JBL Bluetooth Earbuds', price: 8500, costPrice: 7000, stock: 12, unit: 'pcs', category: 'Earphones' },
    { name: 'iPhone 15 Case', price: 1200, costPrice: 800, stock: 30, unit: 'pcs', category: 'Covers' },
    { name: 'Jazz SIM Card', price: 500, costPrice: 450, stock: 50, unit: 'pcs', category: 'SIM Cards' },
    { name: 'Screen Replacement Service', price: 8000, costPrice: 5000, stock: 0, unit: 'service', category: 'Repair Services' },
  ],

  PHARMACY: [
    { name: 'Panadol 500mg Strip', price: 45, costPrice: 35, stock: 100, unit: 'strip', category: 'Tablets' },
    { name: 'Brufen 400mg', price: 85, costPrice: 65, stock: 60, unit: 'strip', category: 'Tablets' },
    { name: 'Ventolin Inhaler', price: 480, costPrice: 400, stock: 15, unit: 'pcs', category: 'Syrups' },
    { name: 'Augmentin 625mg', price: 1200, costPrice: 1050, stock: 20, unit: 'pcs', category: 'Tablets' },
    { name: 'Dettol Antiseptic 250ml', price: 350, costPrice: 300, stock: 25, unit: 'ml', category: 'OTC' },
    { name: 'Multivitamin Capsules', price: 850, costPrice: 700, stock: 30, unit: 'pcs', category: 'Vitamins' },
    { name: 'Baby Diapers Medium', price: 950, costPrice: 800, stock: 20, unit: 'pack', category: 'Baby Care' },
  ],

  RESTAURANT: [
    { name: 'Chicken Karahi (Full)', price: 1800, costPrice: 900, stock: 0, unit: 'plate', category: 'Main Course' },
    { name: 'Chicken Biryani', price: 350, costPrice: 180, stock: 0, unit: 'plate', category: 'Main Course' },
    { name: 'Beef Nihari', price: 450, costPrice: 250, stock: 0, unit: 'plate', category: 'Main Course' },
    { name: 'Chicken Tikka', price: 600, costPrice: 320, stock: 0, unit: 'plate', category: 'BBQ' },
    { name: 'Naan', price: 40, costPrice: 15, stock: 0, unit: 'piece', category: 'Main Course' },
    { name: 'Coca Cola 500ml', price: 100, costPrice: 60, stock: 50, unit: 'pcs', category: 'Beverages' },
    { name: 'Kheer', price: 200, costPrice: 100, stock: 0, unit: 'bowl', category: 'Desserts' },
    { name: 'Family Deal (4 Persons)', price: 3500, costPrice: 1800, stock: 0, unit: 'plate', category: 'Deals' },
  ],

  SALON: [
    { name: 'Haircut - Men', price: 500, costPrice: 0, stock: 0, unit: 'service', category: 'Haircut' },
    { name: 'Haircut - Women', price: 1500, costPrice: 0, stock: 0, unit: 'service', category: 'Haircut' },
    { name: 'Facial - Basic', price: 2500, costPrice: 800, stock: 0, unit: 'service', category: 'Facial' },
    { name: 'Facial - Gold', price: 5000, costPrice: 1500, stock: 0, unit: 'service', category: 'Facial' },
    { name: 'Threading', price: 300, costPrice: 0, stock: 0, unit: 'service', category: 'Threading' },
    { name: 'Bridal Makeup', price: 25000, costPrice: 5000, stock: 0, unit: 'service', category: 'Bridal Makeup' },
    { name: 'Manicure', price: 1200, costPrice: 300, stock: 0, unit: 'service', category: 'Manicure' },
    { name: 'Hair Color', price: 3500, costPrice: 1200, stock: 0, unit: 'service', category: 'Hair Color' },
  ],

  CLOTHING: [
    { name: 'Men Kurta (M)', price: 2500, costPrice: 1500, stock: 15, unit: 'pcs', category: 'Men' },
    { name: 'Ladies Suit (Small)', price: 4500, costPrice: 2800, stock: 20, unit: 'set', category: 'Women' },
    { name: 'Kids T-Shirt', price: 800, costPrice: 400, stock: 30, unit: 'pcs', category: 'Kids' },
    { name: 'Lawn Fabric (per meter)', price: 850, costPrice: 650, stock: 100, unit: 'meter', category: 'Fabric' },
    { name: 'Kurta Stitching', price: 1500, costPrice: 0, stock: 0, unit: 'service', category: 'Tailoring' },
    { name: 'Alteration', price: 300, costPrice: 0, stock: 0, unit: 'service', category: 'Alterations' },
    { name: 'Leather Belt', price: 1500, costPrice: 800, stock: 25, unit: 'pcs', category: 'Accessories' },
  ],

  HARDWARE: [
    { name: 'DG Cement 50kg Bag', price: 1450, costPrice: 1350, stock: 100, unit: 'bag', category: 'Cement' },
    { name: 'Steel Bar 12mm (per kg)', price: 285, costPrice: 265, stock: 500, unit: 'kg', category: 'Steel' },
    { name: 'Master Paint 1 Gallon', price: 3500, costPrice: 3000, stock: 30, unit: 'pcs', category: 'Paints' },
    { name: 'PVC Pipe 1"', price: 250, costPrice: 200, stock: 50, unit: 'meter', category: 'Plumbing' },
    { name: 'Electric Wire 7/29', price: 8500, costPrice: 7500, stock: 20, unit: 'meter', category: 'Electrical' },
    { name: 'Screwdriver Set', price: 850, costPrice: 550, stock: 25, unit: 'set', category: 'Tools' },
    { name: 'Tile 12x12 (per box)', price: 2200, costPrice: 1800, stock: 40, unit: 'box', category: 'Tiles' },
  ],

  BAKERY: [
    { name: 'Vanilla Cake 1lb', price: 1500, costPrice: 700, stock: 5, unit: 'pcs', category: 'Cakes' },
    { name: 'Chocolate Cake 2lb', price: 3000, costPrice: 1400, stock: 3, unit: 'pcs', category: 'Cakes' },
    { name: 'Cream Roll', price: 80, costPrice: 40, stock: 30, unit: 'pcs', category: 'Pastries' },
    { name: 'Bakery Bread', price: 120, costPrice: 80, stock: 40, unit: 'pcs', category: 'Bread' },
    { name: 'Chocolate Chip Cookies', price: 350, costPrice: 200, stock: 20, unit: 'pack', category: 'Biscuits' },
    { name: 'Gulab Jamun', price: 850, costPrice: 500, stock: 15, unit: 'kg', category: 'Sweets' },
    { name: 'Custom Birthday Cake', price: 3500, costPrice: 1500, stock: 0, unit: 'pcs', category: 'Custom Orders' },
  ],

  JEWELRY: [
    { name: '22K Gold Chain (10g)', price: 245000, costPrice: 240000, stock: 5, unit: 'pcs', category: 'Necklaces' },
    { name: '22K Gold Ring (5g)', price: 125000, costPrice: 120000, stock: 8, unit: 'pcs', category: 'Rings' },
    { name: 'Silver Bangles Pair', price: 12000, costPrice: 10000, stock: 15, unit: 'pair', category: 'Bangles' },
    { name: '22K Gold Earrings (8g)', price: 195000, costPrice: 190000, stock: 6, unit: 'pair', category: 'Earrings' },
    { name: 'Bridal Set (Gold)', price: 850000, costPrice: 800000, stock: 2, unit: 'set', category: 'Bridal Sets' },
  ],

  MEAT: [
    { name: 'Beef Boneless (per kg)', price: 1400, costPrice: 1200, stock: 30, unit: 'kg', category: 'Beef' },
    { name: 'Mutton with Bone', price: 2200, costPrice: 1900, stock: 20, unit: 'kg', category: 'Mutton' },
    { name: 'Chicken Whole', price: 550, costPrice: 480, stock: 40, unit: 'kg', category: 'Chicken' },
    { name: 'Chicken Breast Boneless', price: 850, costPrice: 720, stock: 25, unit: 'kg', category: 'Chicken' },
    { name: 'Fish Rohu', price: 700, costPrice: 600, stock: 20, unit: 'kg', category: 'Fish' },
    { name: 'Marinated Tikka', price: 1200, costPrice: 800, stock: 10, unit: 'kg', category: 'Marinated' },
  ],

  DAIRY: [
    { name: 'Fresh Buffalo Milk (per liter)', price: 220, costPrice: 180, stock: 100, unit: 'liter', category: 'Fresh Milk' },
    { name: 'Yogurt/Dahi 500g', price: 150, costPrice: 100, stock: 30, unit: 'kg', category: 'Yogurt/Dahi' },
    { name: 'Desi Ghee 1kg', price: 3200, costPrice: 2800, stock: 15, unit: 'kg', category: 'Butter/Ghee' },
    { name: 'Paneer 250g', price: 350, costPrice: 250, stock: 20, unit: 'pcs', category: 'Paneer' },
    { name: 'Malai (per kg)', price: 800, costPrice: 600, stock: 10, unit: 'kg', category: 'Cream' },
  ],

  AGRI: [
    { name: 'Wheat Seed 40kg Bag', price: 5800, costPrice: 5200, stock: 30, unit: 'bag', category: 'Seeds' },
    { name: 'DAP Fertilizer 50kg', price: 12500, costPrice: 11500, stock: 50, unit: 'bag', category: 'Fertilizer' },
    { name: 'Urea 50kg Bag', price: 4500, costPrice: 4200, stock: 100, unit: 'bag', category: 'Fertilizer' },
    { name: 'Cotton Seed Sungrow', price: 8500, costPrice: 7500, stock: 20, unit: 'bag', category: 'Seeds' },
    { name: 'Pesticide Confidor 100ml', price: 1200, costPrice: 950, stock: 40, unit: 'pcs', category: 'Pesticide' },
    { name: 'Cattle Feed Wanda 50kg', price: 3800, costPrice: 3400, stock: 25, unit: 'bag', category: 'Animal Feed' },
  ],


  APPLIANCES: [
    { name: 'Samsung Refrigerator 300L', price: 145000, costPrice: 128000, stock: 3, unit: 'pcs', category: 'Refrigerators' },
    { name: 'Haier Split AC 1.5 Ton', price: 165000, costPrice: 148000, stock: 5, unit: 'pcs', category: 'Air Conditioners' },
    { name: 'Dawlance Washing Machine 8kg', price: 78000, costPrice: 68000, stock: 4, unit: 'pcs', category: 'Washing Machines' },
    { name: 'TCL LED TV 43"', price: 85000, costPrice: 74000, stock: 6, unit: 'pcs', category: 'LED TVs' },
    { name: 'Panasonic Microwave Oven', price: 42000, costPrice: 36000, stock: 8, unit: 'pcs', category: 'Microwaves' },
    { name: 'Water Dispenser 3-Tap', price: 28000, costPrice: 24000, stock: 10, unit: 'pcs', category: 'Water Dispensers' },
    { name: 'AC Installation Service', price: 3500, costPrice: 0, stock: 0, unit: 'service', category: 'Installation Services' },
  ],

  ELECTRONICS: [
    { name: 'JBL Wireless Earbuds', price: 8500, costPrice: 6800, stock: 15, unit: 'pcs', category: 'Earbuds' },
    { name: 'Apple Watch Series 9', price: 145000, costPrice: 130000, stock: 4, unit: 'pcs', category: 'Smartwatches' },
    { name: 'Anker 20W USB-C Charger', price: 3500, costPrice: 2600, stock: 30, unit: 'pcs', category: 'Chargers & Cables' },
    { name: 'DJI Mini 3 Drone', price: 185000, costPrice: 165000, stock: 3, unit: 'pcs', category: 'Drones' },
    { name: 'Samsung 128GB Memory Card', price: 3800, costPrice: 3000, stock: 25, unit: 'pcs', category: 'Memory Cards' },
    { name: 'Bose SoundLink Speaker', price: 32000, costPrice: 27000, stock: 8, unit: 'pcs', category: 'Speakers' },
    { name: 'Xiaomi Power Bank 20000mAh', price: 6500, costPrice: 5200, stock: 20, unit: 'pcs', category: 'Power Banks' },
    { name: 'Logitech Webcam C920', price: 18500, costPrice: 15500, stock: 10, unit: 'pcs', category: 'Networking' },
  ],

  FLORIST: [
    { name: 'Red Rose Bouquet (12 pcs)', price: 2500, costPrice: 1200, stock: 20, unit: 'bouquet', category: 'Bouquets' },
    { name: 'Mixed Flowers Bouquet', price: 3500, costPrice: 1800, stock: 15, unit: 'bouquet', category: 'Bouquets' },
    { name: 'Single Rose', price: 200, costPrice: 80, stock: 100, unit: 'pcs', category: 'Roses' },
    { name: 'Wedding Stage Decoration', price: 25000, costPrice: 12000, stock: 0, unit: 'pcs', category: 'Wedding Arrangements' },
    { name: 'Funeral Wreath', price: 5500, costPrice: 2800, stock: 5, unit: 'pcs', category: 'Funeral Wreaths' },
    { name: 'Money Plant Pot', price: 850, costPrice: 500, stock: 25, unit: 'pcs', category: 'Potted Plants' },
    { name: 'Anniversary Gift Combo', price: 4500, costPrice: 2400, stock: 10, unit: 'pcs', category: 'Gift Combos' },
    { name: 'Same-day Delivery Charge', price: 500, costPrice: 0, stock: 0, unit: 'service', category: 'Event Decoration' },
  ],

  FURNITURE: [
    { name: 'L-Shape Sofa Set (7 seater)', price: 185000, costPrice: 145000, stock: 3, unit: 'set', category: 'Sofa Sets' },
    { name: 'King Size Bed with Mattress', price: 125000, costPrice: 95000, stock: 5, unit: 'pcs', category: 'Beds' },
    { name: 'Dining Table 6-Seater', price: 85000, costPrice: 65000, stock: 4, unit: 'set', category: 'Dining Tables' },
    { name: '3-Door Wardrobe', price: 95000, costPrice: 72000, stock: 6, unit: 'pcs', category: 'Wardrobes' },
    { name: 'Office Chair Executive', price: 28000, costPrice: 22000, stock: 12, unit: 'pcs', category: 'Office Furniture' },
    { name: 'Custom Kitchen Cabinets (per sqft)', price: 3500, costPrice: 2500, stock: 0, unit: 'sqft', category: 'Custom Furniture' },
    { name: 'Outdoor Patio Set', price: 65000, costPrice: 48000, stock: 3, unit: 'set', category: 'Outdoor' },
    { name: 'Delivery + Assembly', price: 3500, costPrice: 500, stock: 0, unit: 'service', category: 'Assembly Services' },
  ],

  GAMING: [
    { name: 'PlayStation 5 Console', price: 185000, costPrice: 170000, stock: 5, unit: 'pcs', category: 'Consoles' },
    { name: 'EA FC 26 (PS5)', price: 12500, costPrice: 10500, stock: 15, unit: 'pcs', category: 'PlayStation Games' },
    { name: 'Xbox Series X', price: 175000, costPrice: 160000, stock: 3, unit: 'pcs', category: 'Consoles' },
    { name: 'GTA V Premium Edition', price: 4500, costPrice: 3500, stock: 20, unit: 'pcs', category: 'PlayStation Games' },
    { name: 'DualSense Controller', price: 22500, costPrice: 19000, stock: 12, unit: 'pcs', category: 'Gaming Accessories' },
    { name: 'PSN Card $50 (USA)', price: 15500, costPrice: 14000, stock: 30, unit: 'pcs', category: 'Digital Top-ups (PSN/UC/Robux)' },
    { name: 'PUBG UC 600', price: 1650, costPrice: 1400, stock: 50, unit: 'pcs', category: 'Digital Top-ups (PSN/UC/Robux)' },
    { name: 'PC Gaming Session (per hour)', price: 200, costPrice: 30, stock: 0, unit: 'hour', category: 'LAN Sessions' },
    { name: 'PS5 Console Rental (per day)', price: 1500, costPrice: 200, stock: 0, unit: 'pcs', category: 'Console Rentals' },
    { name: 'FIFA Tournament Entry', price: 500, costPrice: 0, stock: 0, unit: 'session', category: 'Tournaments' },
  ],

  OPTICAL: [
    { name: 'Ray-Ban Aviator Frame', price: 18500, costPrice: 14000, stock: 8, unit: 'pcs', category: 'Sunglasses' },
    { name: 'Titan Reading Glasses', price: 6500, costPrice: 4500, stock: 15, unit: 'pcs', category: 'Reading Glasses' },
    { name: 'Anti-Glare Lens (per pair)', price: 3500, costPrice: 2000, stock: 30, unit: 'pair', category: 'Prescription Lenses' },
    { name: 'Photochromic Lens', price: 7500, costPrice: 5000, stock: 20, unit: 'pair', category: 'Prescription Lenses' },
    { name: 'Contact Lens Monthly (Pair)', price: 2500, costPrice: 1600, stock: 40, unit: 'pair', category: 'Contact Lenses' },
    { name: 'Kids Frame Colorful', price: 4500, costPrice: 3000, stock: 12, unit: 'pcs', category: 'Frames - Kids' },
    { name: 'Eye Test / Vision Check', price: 500, costPrice: 0, stock: 0, unit: 'service', category: 'Eye Test Services' },
    { name: 'Contact Lens Solution', price: 850, costPrice: 600, stock: 25, unit: 'pcs', category: 'Accessories' },
  ],

  PETSHOP: [
    { name: 'Royal Canin Dog Food 10kg', price: 12500, costPrice: 10800, stock: 15, unit: 'pack', category: 'Dog Food' },
    { name: 'Whiskas Cat Food 3kg', price: 4500, costPrice: 3800, stock: 20, unit: 'pack', category: 'Cat Food' },
    { name: 'Fish Food Flakes', price: 550, costPrice: 380, stock: 40, unit: 'pcs', category: 'Fish Food' },
    { name: 'Dog Chain & Collar Set', price: 2500, costPrice: 1600, stock: 25, unit: 'set', category: 'Pet Accessories' },
    { name: 'Aquarium Filter', price: 3500, costPrice: 2500, stock: 12, unit: 'pcs', category: 'Aquarium Supplies' },
    { name: 'Pet Grooming Service', price: 2500, costPrice: 500, stock: 0, unit: 'service', category: 'Grooming Services' },
    { name: 'Rabies Vaccine', price: 1500, costPrice: 900, stock: 20, unit: 'pcs', category: 'Vaccinations' },
    { name: 'Deworming Tablets', price: 850, costPrice: 500, stock: 30, unit: 'strip', category: 'Vet Medicines' },
    { name: 'Bird Cage Medium', price: 4500, costPrice: 3200, stock: 8, unit: 'pcs', category: 'Pet Accessories' },
  ],

  SHOE: [
    { name: 'Nike Air Max Men (Size 42)', price: 22500, costPrice: 17000, stock: 8, unit: 'pair', category: 'Sports Shoes' },
    { name: 'Bata Formal Shoes Black', price: 8500, costPrice: 6000, stock: 15, unit: 'pair', category: 'Formal Shoes' },
    { name: 'Servis Ladies Sandals', price: 3500, costPrice: 2200, stock: 25, unit: 'pair', category: 'Sandals' },
    { name: 'Kids School Shoes Black', price: 2800, costPrice: 1800, stock: 30, unit: 'pair', category: 'School Shoes' },
    { name: 'Adidas Sneakers', price: 18500, costPrice: 14000, stock: 12, unit: 'pair', category: 'Sneakers' },
    { name: 'Leather Boots Winter', price: 12500, costPrice: 8500, stock: 10, unit: 'pair', category: 'Boots' },
    { name: 'Casual Loafers', price: 4500, costPrice: 3000, stock: 20, unit: 'pair', category: 'Casual' },
    { name: 'Shoe Polish & Cream', price: 350, costPrice: 220, stock: 40, unit: 'pcs', category: 'Casual' },
  ],

  TOYSTORE: [
    { name: 'LEGO Classic 500 pcs', price: 8500, costPrice: 6500, stock: 12, unit: 'pcs', category: 'Educational Toys' },
    { name: 'Barbie Doll Set', price: 3500, costPrice: 2500, stock: 20, unit: 'pcs', category: 'Dolls' },
    { name: 'Remote Control Car', price: 4500, costPrice: 3200, stock: 15, unit: 'pcs', category: 'Remote Control' },
    { name: 'Monopoly Board Game', price: 3800, costPrice: 2800, stock: 10, unit: 'pcs', category: 'Board Games' },
    { name: 'Puzzle 500 Pieces', price: 1500, costPrice: 950, stock: 25, unit: 'pcs', category: 'Puzzles' },
    { name: 'Baby Rattle Set', price: 850, costPrice: 500, stock: 30, unit: 'pack', category: 'Baby Toys (0-2)' },
    { name: 'Action Figure Superhero', price: 2500, costPrice: 1600, stock: 20, unit: 'pcs', category: 'Action Figures' },
    { name: 'Coloring Set with Markers', price: 1200, costPrice: 700, stock: 35, unit: 'set', category: 'Arts & Crafts' },
    { name: 'Kids Cycle 16 inch', price: 12500, costPrice: 9500, stock: 6, unit: 'pcs', category: 'Outdoor Toys' },
  ],

  SPORTS: [
    { name: 'CA Cricket Bat English Willow', price: 15500, costPrice: 12000, stock: 8, unit: 'pcs', category: 'Cricket' },
    { name: 'Nike Football Size 5', price: 4500, costPrice: 3200, stock: 15, unit: 'pcs', category: 'Football' },
    { name: 'Yonex Badminton Racket', price: 8500, costPrice: 6500, stock: 12, unit: 'pcs', category: 'Badminton' },
    { name: 'Hockey Stick Composite', price: 6500, costPrice: 4800, stock: 10, unit: 'pcs', category: 'Hockey' },
    { name: 'Dumbbells 10kg Pair', price: 5500, costPrice: 4200, stock: 20, unit: 'pair', category: 'Gym Equipment' },
    { name: 'Football Team Jersey', price: 2500, costPrice: 1500, stock: 25, unit: 'pcs', category: 'Sports Wear' },
    { name: 'Cricket Batting Gloves', price: 3500, costPrice: 2400, stock: 15, unit: 'pair', category: 'Cricket' },
    { name: 'Yoga Mat', price: 2500, costPrice: 1600, stock: 30, unit: 'pcs', category: 'Fitness Accessories' },
    { name: 'Team Jersey Printing (per piece)', price: 500, costPrice: 200, stock: 0, unit: 'service', category: 'Team Orders' },
    { name: 'Cricket Ball Leather', price: 850, costPrice: 550, stock: 40, unit: 'pcs', category: 'Cricket' },
  ],

  GENERAL: [
    { name: 'Sample Product 1', price: 100, costPrice: 70, stock: 10, unit: 'pcs', category: 'General' },
    { name: 'Sample Product 2', price: 250, costPrice: 180, stock: 20, unit: 'pcs', category: 'General' },
    { name: 'Sample Product 3', price: 500, costPrice: 380, stock: 15, unit: 'pcs', category: 'General' },
  ],
};

export function getSampleProducts(businessType: string): SampleProduct[] {
  return SAMPLE_PRODUCTS[businessType] || SAMPLE_PRODUCTS.GENERAL;
}
