// Seeds four free foundation courses built from the Sizing Tool's reference list.
// Safe to re-run: a course whose title already exists is skipped. Nothing is truncated.
//
// Usage: npm run db:seed:courses
// The courses are inserted as pending_nou so they still go through the normal approval step.
// Set COURSE_AUTHOR_EMAIL to attribute them to a specific lecturer/trainer; otherwise the
// first lecturer, then the first trainer, is used.
import { config } from 'dotenv';
config({ path: '.env.local' });

import { inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { courses, users } from '../db/schema/index';
import { validateExamQuestions, type ExamQuestion } from '../lib/exam';

interface CourseSeed {
  title: string;
  description: string;
  passMark: number;
  cpdCredits: number;
  modules: { title: string; content: string; minutes: number }[];
  examQuestions: ExamQuestion[];
}

const COURSE_SEEDS: CourseSeed[] = [
  {
    title: 'Refrigerated Facility Load Estimation',
    description:
      'A free foundation course on estimating the refrigeration load of a cold room: transmission, product, infiltration, internal and equipment loads, product properties and cooling time, and how to document and cross-check an estimate. Built from the methods referenced by the Sizing Tool.',
    passMark: 70,
    cpdCredits: 8,
    modules: [
      {
        title: 'The load components that make up a room load',
        minutes: 45,
        content:
          'Refrigeration load is not the same as the building heat loss. A refrigerated room gains heat through five routes, and each must be estimated separately.\n\nTransmission: heat through walls, floor and ceiling, calculated from the area, the insulation U-value and the temperature difference across each surface. Solar radiation on roofs and exposed walls raises the effective difference, which matters in Zimbabwe\u2019s climate.\n\nProduct: heat removed from goods entering the room, including heat above freezing, the latent heat released while freezing, and heat removed below freezing.\n\nInfiltration: warm, humid air entering through doors, damaged seals and defrost cycles. Air changes depend on door size, how often the room is opened and the pressure difference.\n\nInternal: people, lights, forklifts and other equipment working inside the room.\n\nEquipment: fans, motors and defrost heaters inside the refrigerated space. Their electrical energy becomes heat that the plant must remove.\n\nEstimate every component with documented assumptions, then add a deliberate margin.',
      },
      {
        title: 'Product load and cooling time',
        minutes: 50,
        content:
          'Product load depends on the goods, not just their mass. For each product you need its specific heat above freezing, its latent heat of fusion, its specific heat below freezing, its freezing point and its entry temperature.\n\nHeat above freezing is mass multiplied by specific heat and temperature change. Freezing removes latent heat at almost constant temperature. Cooling below freezing uses the frozen specific heat. Foods are mostly water, but the water fraction and the fat, sugar and salt content change all three values, so a single generic figure is not good enough.\n\nCooling and freezing time is controlled by thickness, shape, packaging, surface contact and air velocity. A thick pallet cools far more slowly than the same mass spread in a thin layer. Use the methods and data in the ASHRAE food-properties and cooling-time chapters rather than rules of thumb when the product is valuable or the room is tight.\n\nRecord the product, entry temperature, daily throughput and pull-down time you assumed. Those assumptions are the first thing a reviewer will question.\n\nSources: ASHRAE Handbook \u2014 Refrigerated-Facility Loads (Ch. 24, 2026); Thermal Properties of Foods (Ch. 19, 2026); Cooling and Freezing Times of Foods (Ch. 20, 2026).',
      },
      {
        title: 'Building and checking the estimate',
        minutes: 40,
        content:
          'Work in a fixed order. Define room temperature and humidity, gather dimensions and insulation details, list products and daily entry rates, then calculate transmission, product, infiltration, internal and equipment loads. Convert the total to kW and to tons of refrigeration for cross-checking.\n\nApply a safety margin explicitly and state why it is there. A margin covers unknowns such as door discipline or future product changes; it does not replace missing data. Oversizing costs money and hurts humidity control, so keep the margin proportionate.\n\nCross-check the total against a manufacturer\u2019s selection at your intended evaporating and condensing temperatures. If the load and the selected equipment disagree by more than the margin explains, find out why before ordering.\n\nThe preliminary estimate produced by the Sizing Tool is a starting point, not a certified design. Confirm product properties, site conditions, equipment ratings and applicable Zimbabwean requirements with a qualified engineer before procurement.\n\nSources: ASHRAE Handbook chapters 24, 19 and 20 (2026); Zimbabwe S.I. 49 of 2023 for the controlled-substance context.',
      },
    ],
    examQuestions: [
      {
        id: 'c1-q1',
        type: 'choice',
        text: 'Which item is NOT a component of a refrigerated room load?',
        options: ['Heat transmitted through walls', 'Heat in product entering the room', 'Refrigerant global warming potential', 'Heat from fans and motors inside the room'],
        correctIndex: 2,
      },
      {
        id: 'c1-q2',
        type: 'choice',
        text: 'Transmission load is calculated from:',
        options: ['Area, U-value and temperature difference', 'Refrigerant charge and pipe length', 'Compressor power only', 'Door width only'],
        correctIndex: 0,
      },
      {
        id: 'c1-q3',
        type: 'choice',
        text: 'The heat removed while cooling a product above its freezing point is:',
        options: ['Latent heat of vaporisation', 'Sensible heat', 'Latent heat of fusion', 'No heat'],
        correctIndex: 1,
      },
      {
        id: 'c1-q4',
        type: 'choice',
        text: 'Latent heat of fusion is removed:',
        options: ['While the product freezes at almost constant temperature', 'Only after the product is fully frozen', 'Only during defrost', 'Continuously at any temperature'],
        correctIndex: 0,
      },
      {
        id: 'c1-q5',
        type: 'choice',
        text: 'For the same product mass, which factor most affects cooling time?',
        options: ['Product colour', 'Package label', 'Thickness, geometry and packaging', 'Room name'],
        correctIndex: 2,
      },
      {
        id: 'c1-q6',
        type: 'choice',
        text: 'Internal loads include:',
        options: ['Insulation resistance', 'People, lights and forklifts', 'Refrigerant density', 'Wall thickness'],
        correctIndex: 1,
      },
      {
        id: 'c1-q7',
        type: 'choice',
        text: 'Which ambient condition should be used for design?',
        options: ['The annual average temperature', 'The coldest night of the year', 'A local design condition for the site', 'The temperature at noon on one random day'],
        correctIndex: 2,
      },
      {
        id: 'c1-q8',
        type: 'choice',
        text: 'A safety margin should be:',
        options: ['Hidden inside the product load', 'Large enough to avoid all calculations', 'Applied explicitly and documented, not used to replace missing data', 'Omitted when the client is in a hurry'],
        correctIndex: 2,
      },
      {
        id: 'c1-q9',
        type: 'choice',
        text: 'Infiltration load is driven mainly by:',
        options: ['Door openings, seal condition and humidity difference', 'Compressor oil grade', 'Refrigerant colour', 'Pipe insulation thickness'],
        correctIndex: 0,
      },
      {
        id: 'c1-q10',
        type: 'choice',
        text: 'The best cross-check for a preliminary load estimate is:',
        options: ['A manufacturer selection at the intended evaporating and condensing temperatures', 'The price of the equipment', 'The size of the plant room', 'The number of technicians on site'],
        correctIndex: 0,
      },
    ],
  },
  {
    title: 'Refrigeration Equipment and Line Sizing',
    description:
      'A free foundation course on turning a load estimate into a working system: duty points, component selection, manufacturer software and line sizing with oil return. Built from the Sizing Tool references.',
    passMark: 70,
    cpdCredits: 8,
    modules: [
      {
        title: 'From load to duty point',
        minutes: 45,
        content:
          'A load estimate becomes equipment capacity only at a defined duty point. The duty point is the pair of evaporating and condensing temperatures at which the system will actually run.\n\nEvaporating temperature is set by room temperature and the evaporator temperature difference. A colder evaporator removes more heat per square metre, but it also dries the air and lowers compressor efficiency. Condensing temperature is set by ambient air or water temperature plus the condenser approach.\n\nManufacturer capacity tables are quoted at standard conditions. Correct them for real ambient, altitude, suction superheat, liquid subcooling and part-load operation. A compressor rated at one condition can fall outside its envelope at another, so check the envelope, not just the headline capacity.\n\nSelect for the design day, then confirm the system still behaves sensibly at part load and at the highest expected ambient.\n\nSource: ASHRAE Handbook \u2014 Refrigeration volume.',
      },
      {
        title: 'Matching compressors, heat exchangers and expansion devices',
        minutes: 50,
        content:
          'Each component has its own selection rules, and they must agree at the same duty point.\n\nCompressors are chosen inside an operating envelope that limits evaporating and condensing temperatures, discharge temperature and compression ratio. Condensers are selected on capacity at the design ambient plus a sensible approach; a dirty or undersized condenser raises condensing temperature and quickly erodes capacity. Evaporators are selected on temperature difference, airflow and defrost method, and their rated capacity changes with room humidity and frosting.\n\nExpansion devices must pass the design mass flow with enough margin. A thermostatic valve controls superheat mechanically; an electronic valve can hold superheat over a wider range and supports floating condensing pressure. Whichever is used, confirm rated capacity at the actual pressure difference.\n\nManufacturer selection software is the practical cross-check. Danfoss Coolselector 2 and Copeland\u2019s selection tools model real component behaviour. Use them to test the design, not to replace the load calculation.',
      },
      {
        title: 'Line sizing, pressure drop and oil return',
        minutes: 50,
        content:
          'Piping connects the selected components, and bad piping can undo good selection. Size lines to keep pressure drop small enough that capacity loss stays acceptable, while keeping refrigerant velocity high enough to carry oil back to the compressor.\n\nSuction lines are the usual compromise. Horizontal runs can tolerate low velocity, but vertical risers need a minimum velocity to lift oil; a double riser or an oil trap may be needed at part load. Excessive suction pressure drop lowers the evaporating temperature at the compressor and costs capacity.\n\nLiquid lines should stay liquid: insulate them, avoid unnecessary vertical lifts and use subcooling to prevent flash gas at the expansion valve. Discharge lines must carry hot gas and oil without excessive pressure drop.\n\nUse the ASHRAE Refrigeration volume and the compressor manufacturer\u2019s line-sizing guidance for the refrigerant in use. Record the assumed equivalent length, fittings and riser heights.\n\nSources: ASHRAE Handbook \u2014 Refrigeration volume; Danfoss Coolselector 2; Copeland Product Selection Software.',
      },
    ],
    examQuestions: [
      {
        id: 'c2-q1',
        type: 'choice',
        text: 'A duty point is defined by:',
        options: ['Evaporating and condensing temperatures', 'Room length and width', 'Refrigerant colour', 'Ambient humidity only'],
        correctIndex: 0,
      },
      {
        id: 'c2-q2',
        type: 'choice',
        text: 'All else equal, a higher condensing temperature will:',
        options: ['Increase capacity and reduce power', 'Reduce capacity and increase power', 'Have no effect', 'Only affect the expansion valve'],
        correctIndex: 1,
      },
      {
        id: 'c2-q3',
        type: 'choice',
        text: 'Compressor selection must check:',
        options: ['Only nominal capacity', 'The operating envelope as well as capacity', 'The price only', 'The pipe colour'],
        correctIndex: 1,
      },
      {
        id: 'c2-q4',
        type: 'choice',
        text: 'Condenser approach is the difference between:',
        options: ['Condensing temperature and the cooling medium temperature', 'Suction and discharge pressure', 'Room and product temperature', 'Two evaporators'],
        correctIndex: 0,
      },
      {
        id: 'c2-q5',
        type: 'choice',
        text: 'A dirty condenser typically causes:',
        options: ['Lower condensing temperature and higher capacity', 'Higher condensing temperature and lower capacity', 'No change in operation', 'Lower discharge pressure'],
        correctIndex: 1,
      },
      {
        id: 'c2-q6',
        type: 'choice',
        text: 'The main job of a thermostatic or electronic expansion valve is to:',
        options: ['Control refrigerant flow to maintain superheat', 'Lubricate the compressor', 'Filter moisture', 'Reduce noise'],
        correctIndex: 0,
      },
      {
        id: 'c2-q7',
        type: 'choice',
        text: 'Suction riser velocity must stay high enough to:',
        options: ['Reduce noise', 'Return oil to the compressor', 'Increase subcooling', 'Warm the liquid line'],
        correctIndex: 1,
      },
      {
        id: 'c2-q8',
        type: 'choice',
        text: 'Excessive suction line pressure drop:',
        options: ['Improves capacity', 'Lowers the evaporating temperature at the compressor and costs capacity', 'Has no measurable effect', 'Increases oil return'],
        correctIndex: 1,
      },
      {
        id: 'c2-q9',
        type: 'choice',
        text: 'Liquid subcooling helps by:',
        options: ['Preventing flash gas at the expansion valve', 'Raising condensing pressure', 'Removing oil', 'Heating the suction line'],
        correctIndex: 0,
      },
      {
        id: 'c2-q10',
        type: 'choice',
        text: 'Manufacturer selection software should be used to:',
        options: ['Replace the load calculation', 'Cross-check component performance at real conditions', 'Choose refrigerant colour', 'Size the building'],
        correctIndex: 1,
      },
    ],
  },
  {
    title: 'Refrigerant Safety and Classification',
    description:
      'A free foundation course on ASHRAE safety classes, refrigerant properties and glide, and safe handling on site. Built from the Sizing Tool and Safety Center references.',
    passMark: 70,
    cpdCredits: 8,
    modules: [
      {
        title: 'Reading an ASHRAE safety class',
        minutes: 40,
        content:
          'ASHRAE Standard 34 assigns each refrigerant a safety class made of a letter and a number. The letter describes toxicity: A means lower toxicity, B means higher toxicity. The number describes flammability: 1 means no flame propagation at the test conditions, 2L means lower flammability with a slow flame speed, 2 means flammable and 3 means higher flammability.\n\nExamples: R-410A is A1, R-32 is A2L, R-290 (propane) is A3, R-717 (ammonia) is B2L and R-744 (CO2) is A1 but operates at very high pressure.\n\nThe class is a starting point, not a complete risk assessment. Charge size, room volume, occupancy, ventilation, ignition sources and location all determine what is acceptable. ASHRAE Standard 15 sets refrigeration-system safety requirements that depend on those factors, so check the current edition and the local rules before designing or servicing.\n\nSources: ASHRAE Standards 15 and 34.',
      },
      {
        title: 'Properties, glide and refrigerant blends',
        minutes: 45,
        content:
          'Refrigerant properties drive both performance and safety. Pressure-temperature behaviour sets operating pressures; density and latent heat set mass flow and pipe size; specific heat and conductivity affect heat transfer.\n\nMany modern refrigerants are zeotropic blends: their components boil at slightly different temperatures, so the mixture has a temperature glide. Glide changes the effective evaporating and condensing temperatures and must be accounted for when setting superheat or checking a rating. Because the components can separate when a blend leaks or is charged as a gas, always charge zeotropic blends as liquid from the correct cylinder outlet.\n\nProperty estimates in the Sizing Tool are approximate and intended for preliminary work. For exact values use a validated property database such as NIST REFPROP, and use the refrigerant manufacturer\u2019s data for the specific product.\n\nSources: ASHRAE Standard 34; NIST REFPROP; UNEP Ozone Secretariat (Montreal Protocol and Kigali Amendment).',
      },
      {
        title: 'Safe practice on site',
        minutes: 40,
        content:
          'Safety starts before the cylinder is opened. Identify the refrigerant and its class, check that the cylinder is suitable and within its test date, and use the correct PPE for the product: gloves, eye protection and, where required, respiratory protection. Work in a ventilated area and keep ignition sources away from flammable refrigerants.\n\nNever vent refrigerant to atmosphere. Recover it into a clean, correctly labelled recovery cylinder, and never overfill: recovery cylinders are limited by fill ratio, not by the liquid line. Use leak detection appropriate to the refrigerant, and remember that some detectors are specific to certain gases.\n\nLabel equipment and pipework with the refrigerant and charge, keep safety data sheets available, and follow an emergency plan for releases. If a flammable refrigerant is involved, isolate ignition sources and evacuate before ventilating.\n\nConfirm the manufacturer\u2019s instructions and the applicable standards for the exact product and site.',
      },
    ],
    examQuestions: [
      {
        id: 'c3-q1',
        type: 'choice',
        text: 'In the ASHRAE class A1:',
        options: ['A means lower toxicity and 1 means no flame propagation', 'A means higher toxicity and 1 means flammable', 'A means flammable and 1 means toxic', 'A and 1 both describe pressure'],
        correctIndex: 0,
      },
      {
        id: 'c3-q2',
        type: 'choice',
        text: 'The 2L designation indicates:',
        options: ['Higher flammability', 'Lower flammability with a slow flame speed', 'No flammability', 'Higher toxicity only'],
        correctIndex: 1,
      },
      {
        id: 'c3-q3',
        type: 'choice',
        text: 'R-290 (propane) is classified as:',
        options: ['A1', 'A2L', 'A3', 'B1'],
        correctIndex: 2,
      },
      {
        id: 'c3-q4',
        type: 'choice',
        text: 'R-717 (ammonia) is classified as:',
        options: ['A1', 'B2L', 'A3', 'A2L'],
        correctIndex: 1,
      },
      {
        id: 'c3-q5',
        type: 'choice',
        text: 'R-410A is classified as:',
        options: ['A1', 'A2L', 'A3', 'B2L'],
        correctIndex: 0,
      },
      {
        id: 'c3-q6',
        type: 'choice',
        text: 'A zeotropic blend should be charged:',
        options: ['As a gas from the top of the cylinder', 'As liquid from the correct cylinder outlet', 'In any phase, it does not matter', 'Only after venting the cylinder'],
        correctIndex: 1,
      },
      {
        id: 'c3-q7',
        type: 'choice',
        text: 'Temperature glide is:',
        options: ['The difference between bubble and dew temperatures of a zeotropic blend', 'The rise in room temperature during defrost', 'The pressure drop in a riser', 'The change in oil viscosity'],
        correctIndex: 0,
      },
      {
        id: 'c3-q8',
        type: 'choice',
        text: 'For exact refrigerant property values you should use:',
        options: ['The toolkit\u2019s approximate estimates', 'A validated database such as NIST REFPROP and manufacturer data', 'A rule of thumb from a forum', 'The cylinder colour'],
        correctIndex: 1,
      },
      {
        id: 'c3-q9',
        type: 'choice',
        text: 'Recovery cylinders are limited by:',
        options: ['Fill ratio or weight, so they must never be overfilled', 'The colour of the valve', 'The length of the hose', 'The ambient temperature only'],
        correctIndex: 0,
      },
      {
        id: 'c3-q10',
        type: 'choice',
        text: 'Before working with a flammable refrigerant you should:',
        options: ['Remove ignition sources and ventilate the area', 'Seal the room', 'Increase the charge', 'Disable leak detection'],
        correctIndex: 0,
      },
    ],
  },
  {
    title: 'Zimbabwe Refrigerant Compliance and F-Gas Handling',
    description:
      'A free foundation course on Zimbabwe\u2019s controlled-substance rules, recovery and record-keeping, and the reporting chain for refrigerants. General guidance, not legal advice.',
    passMark: 70,
    cpdCredits: 8,
    modules: [
      {
        title: 'The legal framework',
        minutes: 40,
        content:
          'Zimbabwe controls ozone-depleting substances and fluorinated refrigerants through national regulations, with S.I. 49 of 2023 as the controlled-substances instrument referenced by this toolkit. The Environmental Management Act, administered through the Ministry of Environment, provides the wider environmental framework. Internationally, the Montreal Protocol and its Kigali Amendment set the phase-out and phase-down schedules that national rules implement.\n\nThe practical consequences for a technician or supplier are licensing and permit requirements, restrictions on importing or trading controlled substances, and obligations to handle and record them properly. Requirements are updated from time to time, so confirm the current text and any National Ozone Unit guidance before relying on a specific threshold or form.\n\nSources: Zimbabwe S.I. 49 of 2023; Ministry of Environment (Zimbabwe); UNECE F-gas overview; UNEP Ozone Secretariat.',
      },
      {
        title: 'Recovery, reuse and records',
        minutes: 45,
        content:
          'Recovery is the default. Refrigerant removed during service must be recovered into a suitable container, labelled with the refrigerant and quantity, and either reused or sent for approved destruction. Do not vent, and do not mix refrigerants in one recovery cylinder.\n\nReuse is normally limited to the same refrigerant and, in many jurisdictions, the same owner or equipment. If you are unsure whether reuse is allowed, treat the gas as waste and follow the approved disposal route.\n\nKeep a logbook for every cylinder and every service event: date, site, equipment, refrigerant, quantity recovered or charged, reason for the work and the technician. Accurate records are what an inspector, the National Ozone Unit or an auditor will ask for first, and they also protect you if a cylinder or piece of equipment is later questioned.',
      },
      {
        title: 'Reporting, permits and audits',
        minutes: 40,
        content:
          'Regulated refrigerants sit inside a reporting chain. Importers and suppliers may need permits or quotas; technicians and companies may need to report quantities handled or emissions; equipment owners may need to keep records available.\n\nBuild a simple internal audit routine: reconcile cylinder stock against the logbook, check that recovery cylinders are labelled and in test, confirm that the refrigerant in each system matches its label, and review whether any work was done without a record. Fix gaps while they are small.\n\nWhen a new regulation or National Ozone Unit notice appears, update the logbook fields and staff instructions rather than relying on memory. The association can circulate guidance, but the legal obligation stays with the person or company handling the substance.\n\nThis module is general guidance, not legal advice. Confirm current requirements with the National Ozone Unit and the Ministry of Environment.',
      },
    ],
    examQuestions: [
      {
        id: 'c4-q1',
        type: 'choice',
        text: 'Zimbabwe\u2019s S.I. 49 of 2023 deals with:',
        options: ['Road traffic offences', 'Controlled ozone-depleting substances and related refrigerants', 'Building permits', 'Electricity tariffs'],
        correctIndex: 1,
      },
      {
        id: 'c4-q2',
        type: 'choice',
        text: 'The Kigali Amendment to the Montreal Protocol provides for:',
        options: ['A phase-down of hydrofluorocarbons', 'A ban on all refrigeration', 'Free refrigerant for members', 'A phase-out of CO2'],
        correctIndex: 0,
      },
      {
        id: 'c4-q3',
        type: 'choice',
        text: 'Refrigerant removed during service should be:',
        options: ['Vented to atmosphere', 'Recovered into a suitable container', 'Poured into a drain', 'Left in the system'],
        correctIndex: 1,
      },
      {
        id: 'c4-q4',
        type: 'choice',
        text: 'Recovery cylinders must be:',
        options: ['Unlabelled to avoid confusion', 'Labelled with the refrigerant and quantity, with refrigerants never mixed', 'Filled to the top', 'Used for any gas regardless of condition'],
        correctIndex: 1,
      },
      {
        id: 'c4-q5',
        type: 'choice',
        text: 'A service logbook should record:',
        options: ['Only the invoice value', 'Date, site, equipment, refrigerant, quantity, reason and technician', 'Only the technician\u2019s name', 'Nothing, if the job was small'],
        correctIndex: 1,
      },
      {
        id: 'c4-q6',
        type: 'choice',
        text: 'Recovered refrigerant may be reused:',
        options: ['Always, in any system', 'Only where allowed, typically for the same refrigerant and owner; otherwise follow the approved destruction route', 'Only after venting it first', 'Never under any circumstances'],
        correctIndex: 1,
      },
      {
        id: 'c4-q7',
        type: 'choice',
        text: 'The National Ozone Unit (NOU) is responsible for:',
        options: ['Selling refrigerants', 'National coordination of ozone and refrigerant compliance obligations', 'Issuing driver licences', 'Setting electricity prices'],
        correctIndex: 1,
      },
      {
        id: 'c4-q8',
        type: 'choice',
        text: 'Before relying on a specific legal threshold or form you should:',
        options: ['Use an old copy', 'Confirm the current regulation and NOU guidance', 'Ask a customer', 'Ignore it if the job is small'],
        correctIndex: 1,
      },
      {
        id: 'c4-q9',
        type: 'choice',
        text: 'A useful internal audit step is to:',
        options: ['Reconcile cylinder stock against the logbook', 'Delete old records', 'Mix recovery cylinders to save space', 'Skip labelling to save time'],
        correctIndex: 0,
      },
      {
        id: 'c4-q10',
        type: 'choice',
        text: 'Legal responsibility for handling a controlled refrigerant:',
        options: ['Belongs only to the manufacturer', 'Stays with the person or company handling the substance', 'Ends when the cylinder is closed', 'Belongs to the customer only'],
        correctIndex: 1,
      },
    ],
  },
];

async function resolveAuthor() {
  const email = process.env.COURSE_AUTHOR_EMAIL?.trim();
  if (email) {
    const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.email, [email])).limit(1);
    if (!user) throw new Error(`COURSE_AUTHOR_EMAIL ${email} does not match any user.`);
    return user;
  }

  for (const role of ['lecturer', 'trainer'] as const) {
    const [user] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.role, [role]))
      .limit(1);
    if (user) return user;
  }

  throw new Error(
    'No lecturer or trainer account exists. Create one first, or set COURSE_AUTHOR_EMAIL to an existing user.'
  );
}

async function main() {
  const author = await resolveAuthor();
  const titles = COURSE_SEEDS.map((course) => course.title);

  const existing = await db.select({ title: courses.title }).from(courses).where(inArray(courses.title, titles));
  const existingTitles = new Set(existing.map((row) => row.title));
  const toInsert = COURSE_SEEDS.filter((course) => !existingTitles.has(course.title));

  if (toInsert.length === 0) {
    console.log(`All ${COURSE_SEEDS.length} courses already exist; nothing to do.`);
    return;
  }

  for (const course of toInsert) {
    const check = validateExamQuestions(course.examQuestions);
    if (!check.ok) throw new Error(`${course.title}: ${check.error}`);
  }

  await db.insert(courses).values(
    toInsert.map((course) => ({
      lecturerId: author.id,
      lecturerName: author.name,
      title: course.title,
      description: course.description,
      modules: course.modules,
      examQuestions: course.examQuestions,
      status: 'pending_nou' as const,
      passMark: course.passMark,
      cpdCredits: course.cpdCredits,
    }))
  );

  for (const course of toInsert) {
    console.log(`inserted: ${course.title} (${course.modules.length} modules, ${course.examQuestions.length} questions)`);
  }
  console.log(`\nDone. ${toInsert.length} course(s) inserted as pending_nou for ${author.name}.`);
  console.log('Approve them at /learn/approvals before learners can enrol.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
