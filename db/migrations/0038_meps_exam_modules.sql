-- Links each MEPS exam question to the module it tests, so learners can see where to revise. Only touches the questions written for this course.
UPDATE "courses"
SET "exam_questions" = (
      SELECT jsonb_agg(
        CASE WHEN item.q ->> 'id' ~ '^meps-q[0-9]+$' THEN item.q || jsonb_build_object('moduleIndex',
          CASE
            WHEN substring(item.q ->> 'id' from 7)::int <= 3 THEN 0
            WHEN substring(item.q ->> 'id' from 7)::int <= 6 THEN 1
            WHEN substring(item.q ->> 'id' from 7)::int <= 9 THEN 2
            WHEN substring(item.q ->> 'id' from 7)::int <= 13 THEN 3
            ELSE 4
          END)
        ELSE item.q END
        ORDER BY item.ord)
      FROM jsonb_array_elements("exam_questions") WITH ORDINALITY AS item(q, ord)
    ),
    "updated_at" = now()
WHERE "title" = 'Energy Efficiency & MEPS Framework'
  AND jsonb_array_length("exam_questions") > 0
  AND jsonb_array_length("modules") = 5;
