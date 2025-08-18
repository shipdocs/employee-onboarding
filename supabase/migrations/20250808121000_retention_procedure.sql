-- Migration: retention_procedure
-- Created at: 2025-08-08T12:10:00Z
-- Description: Create retention procedure perform_data_retention_run(dry_run boolean default true)

CREATE OR REPLACE FUNCTION public.perform_data_retention_run(dry_run boolean DEFAULT true)
RETURNS TABLE(metric text, affected integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_audit timestamp := now() - interval '90 days';
  cutoff_emails timestamp := now() - interval '30 days';
  cutoff_metrics timestamp := now() - interval '60 days';
  cutoff_exports timestamp := now() - interval '21 days';
  v_count integer;
BEGIN
  -- audit_log
  IF dry_run THEN
    SELECT count(*) INTO v_count FROM public.audit_log WHERE created_at < cutoff_audit;
  ELSE
    DELETE FROM public.audit_log WHERE created_at < cutoff_audit;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  RETURN QUERY SELECT 'audit_log_deleted', COALESCE(v_count,0);

  -- email_logs
  IF dry_run THEN
    SELECT count(*) INTO v_count FROM public.email_logs WHERE created_at < cutoff_emails;
  ELSE
    DELETE FROM public.email_logs WHERE created_at < cutoff_emails; GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  RETURN QUERY SELECT 'email_logs_deleted', COALESCE(v_count,0);

  -- email_queue (processed)
  IF dry_run THEN
    SELECT count(*) INTO v_count FROM public.email_queue WHERE processed = true AND updated_at < cutoff_emails;
  ELSE
    DELETE FROM public.email_queue WHERE processed = true AND updated_at < cutoff_emails; GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  RETURN QUERY SELECT 'email_queue_deleted', COALESCE(v_count,0);

  -- performance_metrics
  IF dry_run THEN
    SELECT count(*) INTO v_count FROM public.performance_metrics WHERE created_at < cutoff_metrics;
  ELSE
    DELETE FROM public.performance_metrics WHERE created_at < cutoff_metrics; GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  RETURN QUERY SELECT 'performance_metrics_deleted', COALESCE(v_count,0);

  -- security_events
  IF dry_run THEN
    SELECT count(*) INTO v_count FROM public.security_events WHERE (details->>'timestamp')::timestamp < cutoff_metrics;
  ELSE
    DELETE FROM public.security_events WHERE (details->>'timestamp')::timestamp < cutoff_metrics; GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  RETURN QUERY SELECT 'security_events_deleted', COALESCE(v_count,0);

  -- data_exports (older than cutoff and status=completed)
  IF dry_run THEN
    SELECT count(*) INTO v_count FROM public.data_exports WHERE status = 'completed' AND updated_at < cutoff_exports;
  ELSE
    DELETE FROM public.data_exports WHERE status = 'completed' AND updated_at < cutoff_exports; GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  RETURN QUERY SELECT 'data_exports_deleted', COALESCE(v_count,0);

  -- log audit event (only for destructive run)
  IF NOT dry_run THEN
    INSERT INTO public.audit_log(event_type, details, created_at)
    VALUES ('retention_run', jsonb_build_object(
      'timestamp', now(),
      'cutoff_audit_days', 90,
      'cutoff_emails_days', 30,
      'cutoff_metrics_days', 60,
      'cutoff_exports_days', 21
    ), now());
  END IF;
  
  -- Explicit return for clarity
  RETURN;
END;
$$;