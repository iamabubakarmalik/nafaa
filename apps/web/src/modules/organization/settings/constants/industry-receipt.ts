// apps/web/src/modules/organization/settings/constants/industry-receipt.ts
export interface IndustryReceiptTemplate {
  template: string;
  label: string;
  emoji: string;
  fields: Array<{ key: string; label: string; desc: string; defaultValue: boolean }>;
}

export const INDUSTRY_RECEIPT_TEMPLATES: Record<string, IndustryReceiptTemplate> = {
  RESTAURANT: {
    template: 'RESTAURANT', label: 'Restaurant / Cafe', emoji: '🍽️',
    fields: [
      { key: 'showTableNumber', label: 'Table Number', desc: 'Table # print karein', defaultValue: true },
      { key: 'showOrderMode', label: 'Order Mode', desc: 'Dine-in / Takeaway / Delivery', defaultValue: true },
      { key: 'showWaiterName', label: 'Waiter Name', desc: 'Server name receipt pe', defaultValue: false },
      { key: 'showModifiers', label: 'Modifiers', desc: 'Extra cheese, spicy etc.', defaultValue: true },
      { key: 'showSpecialInstructions', label: 'Special Instructions', desc: 'Customer notes', defaultValue: true },
      { key: 'showServiceCharge', label: 'Service Charge', desc: 'Service charge line', defaultValue: true },
      { key: 'showTip', label: 'Tip Line', desc: 'Tip amount', defaultValue: true },
      { key: 'showKot', label: 'Kitchen KOT', desc: 'Print kitchen order ticket', defaultValue: true },
    ],
  },
  BAKERY: {
    template: 'BAKERY', label: 'Bakery / Cake Shop', emoji: '🍰',
    fields: [
      { key: 'showOrderMode', label: 'Order Type', desc: 'Custom cake / Retail', defaultValue: true },
      { key: 'showSpecialInstructions', label: 'Special Instructions', desc: 'Cake message, allergies', defaultValue: true },
      { key: 'showDeliveryDate', label: 'Delivery Date', desc: 'Custom order pickup date', defaultValue: true },
    ],
  },
  CARPET: {
    template: 'CARPET', label: 'Carpets / Flooring', emoji: '🧶',
    fields: [
      { key: 'showDimensions', label: 'Dimensions', desc: 'Length × Width', defaultValue: true },
      { key: 'showSqft', label: 'Square Footage', desc: 'Total sqft', defaultValue: true },
      { key: 'showRollNumber', label: 'Roll Number', desc: 'Original roll ID', defaultValue: true },
      { key: 'showCutDetails', label: 'Cut Details', desc: 'Cut piece info', defaultValue: true },
    ],
  },
  MOBILE: {
    template: 'MOBILE', label: 'Mobile / Electronics', emoji: '📱',
    fields: [
      { key: 'showImei', label: 'IMEI Number', desc: 'Device IMEI print', defaultValue: true },
      { key: 'showWarranty', label: 'Warranty Period', desc: 'Warranty details', defaultValue: true },
      { key: 'showSerialNumber', label: 'Serial Number', desc: 'Product serial', defaultValue: true },
      { key: 'showPtaStatus', label: 'PTA Status', desc: 'Approved/Non-PTA', defaultValue: true },
    ],
  },
  PHARMACY: {
    template: 'PHARMACY', label: 'Pharmacy / Medical', emoji: '💊',
    fields: [
      { key: 'showBatchNumber', label: 'Batch Number', desc: 'Medicine batch', defaultValue: true },
      { key: 'showExpiry', label: 'Expiry Date', desc: 'Expiry per item', defaultValue: true },
      { key: 'showPrescriptionInfo', label: 'Prescription Info', desc: 'Doctor + Rx#', defaultValue: true },
      { key: 'showDrugSchedule', label: 'Drug Schedule', desc: 'OTC/Schedule G/H', defaultValue: false },
    ],
  },
  SALON: {
    template: 'SALON', label: 'Salon / Beauty', emoji: '💇',
    fields: [
      { key: 'showStaffName', label: 'Staff Name', desc: 'Stylist name', defaultValue: true },
      { key: 'showServiceTime', label: 'Service Duration', desc: 'Minutes per service', defaultValue: false },
      { key: 'showMembership', label: 'Membership Info', desc: 'Active plan', defaultValue: true },
    ],
  },
  CLOTHING: {
    template: 'CLOTHING', label: 'Clothing / Garments', emoji: '👕',
    fields: [
      { key: 'showSize', label: 'Size', desc: 'Item size', defaultValue: true },
      { key: 'showColor', label: 'Color', desc: 'Item color', defaultValue: true },
      { key: 'showTailoringDetails', label: 'Tailoring Details', desc: 'Custom stitch info', defaultValue: false },
    ],
  },
  HARDWARE: {
    template: 'HARDWARE', label: 'Hardware / Construction', emoji: '🔧',
    fields: [
      { key: 'showQuotationRef', label: 'Quotation Ref', desc: 'Linked quote #', defaultValue: true },
      { key: 'showProjectName', label: 'Project Name', desc: 'Site/project name', defaultValue: false },
      { key: 'showDeliveryInfo', label: 'Delivery Info', desc: 'Site address', defaultValue: true },
    ],
  },
  JEWELRY: {
    template: 'JEWELRY', label: 'Jewelry / Sunar', emoji: '💎',
    fields: [
      { key: 'showPurity', label: 'Purity', desc: '22K/24K etc.', defaultValue: true },
      { key: 'showGoldRate', label: 'Metal Rate', desc: 'Per gram rate', defaultValue: true },
      { key: 'showMakingCharges', label: 'Making Charges', desc: 'Labor cost', defaultValue: true },
      { key: 'showWastage', label: 'Wastage', desc: 'Wastage %', defaultValue: true },
      { key: 'showHallmark', label: 'Hallmark #', desc: 'Certification', defaultValue: false },
    ],
  },
  DAIRY: {
    template: 'DAIRY', label: 'Dairy / Milk Shop', emoji: '🥛',
    fields: [
      { key: 'showRoute', label: 'Delivery Route', desc: 'Route number', defaultValue: true },
      { key: 'showMonthlyBalance', label: 'Monthly Balance', desc: 'Khata balance', defaultValue: true },
    ],
  },
  MEAT: {
    template: 'MEAT', label: 'Meat / Butchery', emoji: '🥩',
    fields: [
      { key: 'showWeight', label: 'Weight (kg)', desc: 'Actual weight', defaultValue: true },
      { key: 'showCutType', label: 'Cut Type', desc: 'Boneless/with bone', defaultValue: true },
      { key: 'showHalalCert', label: 'Halal Certification', desc: 'Halal number', defaultValue: false },
    ],
  },
  AGRI: {
    template: 'AGRI', label: 'Agri / Feed Store', emoji: '🌾',
    fields: [
      { key: 'showFarmerName', label: 'Farmer Name', desc: 'Registered farmer', defaultValue: true },
      { key: 'showCropTarget', label: 'Crop', desc: 'Target crop', defaultValue: false },
      { key: 'showSubsidyInfo', label: 'Subsidy Info', desc: 'Govt subsidy', defaultValue: false },
    ],
  },
  HOTEL: {
    template: 'HOTEL', label: 'Hotel / Guest House', emoji: '🏨',
    fields: [
      { key: 'showRoomNumber', label: 'Room Number', desc: 'Room #', defaultValue: true },
      { key: 'showCheckInOut', label: 'Check-in/out', desc: 'Dates', defaultValue: true },
      { key: 'showGuestCount', label: 'Guest Count', desc: 'Adults/Kids', defaultValue: true },
      { key: 'showFolio', label: 'Folio Breakdown', desc: 'All charges', defaultValue: true },
    ],
  },
  GYM: {
    template: 'GYM', label: 'Gym / Fitness', emoji: '💪',
    fields: [
      { key: 'showMembershipPlan', label: 'Membership Plan', desc: 'Plan name', defaultValue: true },
      { key: 'showValidity', label: 'Valid Until', desc: 'Expiry date', defaultValue: true },
      { key: 'showVisitsLeft', label: 'Visits Left', desc: 'Remaining count', defaultValue: false },
    ],
  },
  CLINIC: {
    template: 'CLINIC', label: 'Clinic / Doctor', emoji: '⚕️',
    fields: [
      { key: 'showDoctorName', label: 'Doctor Name', desc: 'Attending doctor', defaultValue: true },
      { key: 'showMrn', label: 'Patient MRN', desc: 'Medical record #', defaultValue: true },
      { key: 'showVisitType', label: 'Visit Type', desc: 'Consultation/Follow-up', defaultValue: true },
      { key: 'showDiagnosis', label: 'Diagnosis', desc: 'Brief diagnosis', defaultValue: false },
    ],
  },
  BOOKSTORE: {
    template: 'BOOKSTORE', label: 'Bookstore / Stationery', emoji: '📚',
    fields: [
      { key: 'showIsbn', label: 'ISBN', desc: 'Book ISBN', defaultValue: false },
      { key: 'showAuthor', label: 'Author', desc: 'Author name', defaultValue: false },
      { key: 'showSchoolName', label: 'School Name', desc: 'For school lists', defaultValue: false },
    ],
  },
  AUTO_PARTS: {
    template: 'AUTO_PARTS', label: 'Auto Parts / Workshop', emoji: '🔩',
    fields: [
      { key: 'showVehicleInfo', label: 'Vehicle Info', desc: 'Make/model/reg #', defaultValue: true },
      { key: 'showOdometer', label: 'Odometer', desc: 'Current KM reading', defaultValue: true },
      { key: 'showLaborBreakdown', label: 'Labor Breakdown', desc: 'Parts vs labor', defaultValue: true },
      { key: 'showWarranty', label: 'Warranty', desc: 'Parts/labor warranty', defaultValue: true },
    ],
  },
  SERVICE: {
    template: 'SERVICE', label: 'Service Business', emoji: '🔧',
    fields: [
      { key: 'showJobNumber', label: 'Job Number', desc: 'Ticket #', defaultValue: true },
      { key: 'showTechnicianName', label: 'Technician Name', desc: 'Assigned tech', defaultValue: true },
      { key: 'showBeforeAfterPhotos', label: 'Before/After Photos', desc: 'Photo QR link', defaultValue: false },
      { key: 'showAmcInfo', label: 'AMC Info', desc: 'AMC contract details', defaultValue: false },
    ],
  },
  GROCERY: {
    template: 'GROCERY', label: 'Grocery / Kiryana', emoji: '🛒',
    fields: [
      { key: 'showBatchNumber', label: 'Batch Number', desc: 'Product batches', defaultValue: false },
      { key: 'showExpiry', label: 'Expiry Date', desc: 'Per item expiry', defaultValue: false },
      { key: 'showUnitPrice', label: 'Unit Price', desc: 'Per kg / per piece', defaultValue: true },
    ],
  },

  // ─── 10 NEW industries ───
  APPLIANCES: {
    template: 'APPLIANCES', label: 'Home Appliances', emoji: '🏠',
    fields: [
      { key: 'showSerialNumber', label: 'Serial Number', desc: 'Appliance serial #', defaultValue: true },
      { key: 'showWarranty', label: 'Warranty Period', desc: 'Warranty duration + terms', defaultValue: true },
      { key: 'showInstallationDate', label: 'Installation Date', desc: 'Scheduled install date', defaultValue: true },
      { key: 'showTechnicianName', label: 'Technician Name', desc: 'Delivery/install technician', defaultValue: true },
      { key: 'showAmcInfo', label: 'AMC Info', desc: 'AMC contract details', defaultValue: false },
      { key: 'showEmiPlan', label: 'EMI Plan', desc: 'EMI schedule & installments', defaultValue: true },
    ],
  },
  ELECTRONICS: {
    template: 'ELECTRONICS', label: 'Electronics / Gadgets', emoji: '🔌',
    fields: [
      { key: 'showSerialNumber', label: 'Serial Number', desc: 'Device serial #', defaultValue: true },
      { key: 'showImei', label: 'IMEI (if applicable)', desc: 'IMEI for smartwatches/drones', defaultValue: true },
      { key: 'showWarranty', label: 'Warranty Period', desc: 'Warranty details', defaultValue: true },
      { key: 'showBundleItems', label: 'Bundle Items', desc: 'Combo deal breakdown', defaultValue: true },
      { key: 'showTradeInValue', label: 'Trade-in Value', desc: 'Old device credit', defaultValue: false },
    ],
  },
  FLORIST: {
    template: 'FLORIST', label: 'Florist / Flower Shop', emoji: '🌸',
    fields: [
      { key: 'showDeliveryDate', label: 'Delivery Date', desc: 'Same-day / scheduled delivery', defaultValue: true },
      { key: 'showOccasion', label: 'Occasion', desc: 'Anniversary/Birthday/Funeral', defaultValue: true },
      { key: 'showSpecialInstructions', label: 'Card Message', desc: 'Custom card note', defaultValue: true },
      { key: 'showDeliveryAddress', label: 'Delivery Address', desc: 'Recipient address', defaultValue: true },
      { key: 'showFreshness', label: 'Freshness Note', desc: 'Cut date / expected lifespan', defaultValue: false },
    ],
  },
  FURNITURE: {
    template: 'FURNITURE', label: 'Furniture Store', emoji: '🪑',
    fields: [
      { key: 'showDimensions', label: 'Dimensions', desc: 'L × W × H', defaultValue: true },
      { key: 'showMaterial', label: 'Material / Finish', desc: 'Wood/fabric/finish type', defaultValue: true },
      { key: 'showWarranty', label: 'Warranty', desc: 'Warranty period', defaultValue: true },
      { key: 'showDeliveryDate', label: 'Delivery Date', desc: 'Scheduled delivery', defaultValue: true },
      { key: 'showAssemblyRequired', label: 'Assembly Info', desc: 'Assembly included/extra', defaultValue: true },
      { key: 'showCustomOrderRef', label: 'Custom Order Ref', desc: 'Workshop job #', defaultValue: false },
    ],
  },
  GAMING: {
    template: 'GAMING', label: 'Gaming Shop / Cyber Cafe', emoji: '🎮',
    fields: [
      { key: 'showSerialNumber', label: 'Console Serial', desc: 'Console/product serial #', defaultValue: true },
      { key: 'showPlatform', label: 'Platform', desc: 'PS5/Xbox/PC/Switch', defaultValue: true },
      { key: 'showWarranty', label: 'Warranty Period', desc: 'Warranty details', defaultValue: true },
      { key: 'showRentalPeriod', label: 'Rental Period', desc: 'Console rental duration', defaultValue: false },
      { key: 'showRentalDeposit', label: 'Security Deposit', desc: 'Refundable deposit', defaultValue: false },
      { key: 'showSessionTime', label: 'Session Duration', desc: 'LAN cafe billing time', defaultValue: false },
      { key: 'showTopupCode', label: 'Top-up Code Reveal', desc: 'PSN/UC/Robux code (redact until sold)', defaultValue: true },
    ],
  },
  OPTICAL: {
    template: 'OPTICAL', label: 'Optical / Eyewear', emoji: '👓',
    fields: [
      { key: 'showPrescription', label: 'Prescription Details', desc: 'Sphere/Cyl/Axis per eye', defaultValue: true },
      { key: 'showLensType', label: 'Lens Type', desc: 'Anti-glare/Photochromic/etc', defaultValue: true },
      { key: 'showFrameDetails', label: 'Frame Details', desc: 'Brand/model/size', defaultValue: true },
      { key: 'showEyeTestDate', label: 'Eye Test Date', desc: 'Last eye test date', defaultValue: true },
      { key: 'showOptometristName', label: 'Optometrist', desc: 'Prescribing doctor', defaultValue: true },
      { key: 'showWarranty', label: 'Warranty', desc: 'Frame + lens warranty', defaultValue: true },
      { key: 'showFollowUpDate', label: 'Follow-up Date', desc: 'Next check-up reminder', defaultValue: false },
    ],
  },
  PETSHOP: {
    template: 'PETSHOP', label: 'Pet Shop / Vet Store', emoji: '🐾',
    fields: [
      { key: 'showPetName', label: 'Pet Name', desc: 'Customer pet name', defaultValue: true },
      { key: 'showPetSpecies', label: 'Species / Breed', desc: 'Dog/Cat/Bird + breed', defaultValue: true },
      { key: 'showBatchNumber', label: 'Batch Number', desc: 'Food/medicine batch', defaultValue: true },
      { key: 'showExpiry', label: 'Expiry Date', desc: 'Food/medicine expiry', defaultValue: true },
      { key: 'showVaccinationDate', label: 'Vaccination Date', desc: 'Last vaccination', defaultValue: false },
      { key: 'showNextDueDate', label: 'Next Due Date', desc: 'Next vaccine/booster', defaultValue: true },
      { key: 'showVetName', label: 'Vet Name', desc: 'Attending veterinarian', defaultValue: false },
    ],
  },
  SHOE: {
    template: 'SHOE', label: 'Shoe Store / Footwear', emoji: '👟',
    fields: [
      { key: 'showSize', label: 'Size', desc: 'Shoe size (EU/UK/US)', defaultValue: true },
      { key: 'showColor', label: 'Color', desc: 'Shoe color', defaultValue: true },
      { key: 'showBrand', label: 'Brand', desc: 'Brand name', defaultValue: true },
      { key: 'showWarranty', label: 'Warranty', desc: 'Warranty period', defaultValue: true },
      { key: 'showOriginalBox', label: 'Original Box', desc: 'Box included?', defaultValue: false },
      { key: 'showExchangePolicy', label: 'Exchange Policy', desc: '7-day exchange terms', defaultValue: true },
    ],
  },
  TOYSTORE: {
    template: 'TOYSTORE', label: 'Toy Store', emoji: '🧸',
    fields: [
      { key: 'showAgeGroup', label: 'Age Group', desc: 'Recommended age', defaultValue: true },
      { key: 'showSafetyCert', label: 'Safety Certification', desc: 'CE/ASTM certification', defaultValue: true },
      { key: 'showWarranty', label: 'Warranty', desc: 'Manufacturer warranty', defaultValue: true },
      { key: 'showGiftWrap', label: 'Gift Wrap', desc: 'Gift wrapping applied', defaultValue: false },
      { key: 'showBirthdayMessage', label: 'Birthday Message', desc: 'Custom card note', defaultValue: false },
    ],
  },
  SPORTS: {
    template: 'SPORTS', label: 'Sports Shop', emoji: '🏏',
    fields: [
      { key: 'showSize', label: 'Size', desc: 'Jersey/shoe/equipment size', defaultValue: true },
      { key: 'showBrand', label: 'Brand', desc: 'Brand name', defaultValue: true },
      { key: 'showWarranty', label: 'Warranty', desc: 'Warranty period', defaultValue: true },
      { key: 'showTeamOrderRef', label: 'Team Order Ref', desc: 'Bulk team order #', defaultValue: false },
      { key: 'showCustomPrint', label: 'Custom Printing', desc: 'Name/number printing', defaultValue: false },
      { key: 'showSport', label: 'Sport Category', desc: 'Cricket/Football/etc', defaultValue: true },
    ],
  },

  STANDARD: {
    template: 'STANDARD', label: 'Standard Retail', emoji: '🏬',
    fields: [
      { key: 'showUnit', label: 'Unit', desc: 'Unit column', defaultValue: true },
      { key: 'showMrp', label: 'MRP', desc: 'MRP line', defaultValue: false },
      { key: 'showBarcode', label: 'Invoice Barcode', desc: 'Barcode of invoice #', defaultValue: false },
    ],
  },
};

export function getReceiptTemplate(businessType?: string | null): IndustryReceiptTemplate {
  if (!businessType) return INDUSTRY_RECEIPT_TEMPLATES.STANDARD;
  const key = String(businessType).toUpperCase();
  return INDUSTRY_RECEIPT_TEMPLATES[key] || INDUSTRY_RECEIPT_TEMPLATES.STANDARD;
}
