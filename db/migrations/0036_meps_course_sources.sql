-- Shows learners the references behind the MEPS exam, at the end of the course's last module. Adds them once only.
UPDATE "courses"
SET "modules" = jsonb_set(
      "modules",
      ARRAY[(jsonb_array_length("modules") - 1)::text, 'content'],
      to_jsonb(COALESCE("modules" -> (jsonb_array_length("modules") - 1) ->> 'content', '') || E'\n\nSources:\nAfrican Energy Commission (AFREC), MEPS Development, Implementations and Adoption Hybrid Training: https://au-afrec.org/meps-development-implementations-and-adoption-hybrid-training\nUNEP Ozone Secretariat, Minimum energy performance standards and labelling: https://ozone.unep.org/system/files/documents/3.1_Minimum-energy-performance-standards-and-labelling.pdf\nCPRC and CLASP, Policy instruments taxonomy: https://cprc-clasp.ngo/policy-instruments-taxonomy-details\nSDSN, Energy rating labels brief: https://files.unsdsn.org/CEET%20Brief_Energy%20Rating%20Labels%20and%20Potential%20for%20Energy%20Savings%20Across%20the%20Global%20South.pdf\nClean Energy Ministerial, Ensuring compliance with MEPS and energy labels: https://www.cleanenergyministerial.org/sead_resources/ensuring-compliance-with-meps-and-energy-labels')
    ),
    "updated_at" = now()
WHERE "title" = 'Energy Efficiency & MEPS Framework'
  AND jsonb_typeof("modules") = 'array'
  AND jsonb_array_length("modules") > 0
  AND position('au-afrec.org/meps-development' in "modules"::text) = 0;
