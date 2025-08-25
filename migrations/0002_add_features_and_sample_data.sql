-- Add recurring goals support
ALTER TABLE goals 
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN recurrence_rule JSONB;

-- Add priority to goals
ALTER TABLE goals
ADD COLUMN priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 3);

-- Add notes table for general notes
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(50),
    reference_id UUID, -- Can reference goals, tasks, etc.
    reference_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for new tables
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Add sample categories
INSERT INTO categories (id, name, color, created_at) VALUES 
    (uuid_generate_v5(uuid_nil(), 'category_health'), 'Health & Fitness', '#4CAF50', NOW()),
    (uuid_generate_v5(uuid_nil(), 'category_career'), 'Career & Skills', '#2196F3', NOW()),
    (uuid_generate_v5(uuid_nil(), 'category_finance'), 'Finance', '#FFC107', NOW()),
    (uuid_generate_v5(uuid_nil(), 'category_education'), 'Education', '#9C27B0', NOW()),
    (uuid_generate_v5(uuid_nil(), 'category_relationships'), 'Relationships', '#E91E63', NOW()),
    (uuid_generate_v5(uuid_nil(), 'category_personal'), 'Personal Growth', '#00BCD4', NOW()),
    (uuid_generate_v5(uuid_nil(), 'category_hobbies'), 'Hobbies', '#FF9800', NOW()),
    (uuid_generate_v5(uuid_nil(), 'category_other'), 'Other', '#9E9E9E', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add function to calculate goal progress
CREATE OR REPLACE FUNCTION calculate_goal_progress(goal_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    target_value NUMERIC;
    current_value NUMERIC;
    progress NUMERIC;
BEGIN
    SELECT g.target_value, g.current_value 
    INTO target_value, current_value
    FROM goals g
    WHERE g.id = goal_id;
    
    IF target_value IS NULL OR target_value = 0 THEN
        RETURN 0;
    END IF;
    
    progress := (COALESCE(current_value, 0) / target_value) * 100;
    RETURN LEAST(GREATEST(progress, 0), 100); -- Ensure between 0 and 100
END;
$$ LANGUAGE plpgsql;
