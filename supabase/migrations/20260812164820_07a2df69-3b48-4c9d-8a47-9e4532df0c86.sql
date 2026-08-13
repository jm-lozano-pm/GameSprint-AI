ALTER TABLE public.backlog_items ALTER COLUMN status SET DEFAULT 'UNPLANNED'::board_status;

UPDATE public.backlog_items
SET status = 'UNPLANNED'::board_status
WHERE sprint_id IS NULL AND status <> 'DONE'::board_status;