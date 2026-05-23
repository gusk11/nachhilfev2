-- Create test student
INSERT INTO students (name, pin_hash, pin_salt) VALUES (
  'Test Schüler',
  'abc123hash',
  'salt123'
) ON CONFLICT DO NOTHING;

-- Create lesson schedule for Monday at 15:00
INSERT INTO lesson_schedules (student_id, day_of_week, start_time, duration_minutes) 
SELECT id, 1, '15:00', 60 FROM students WHERE name = 'Test Schüler'
ON CONFLICT DO NOTHING;
