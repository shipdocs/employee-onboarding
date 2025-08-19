--
-- PostgreSQL database dump
--

\restrict XUUfNO6AuuWzIlsli5BcRyVTEyohTFiqUvkKfu7Q0clowBEtznh9WXSg3KFifLc

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_logs (
    id bigint NOT NULL,
    method character varying(10) NOT NULL,
    endpoint character varying(500) NOT NULL,
    status_code integer NOT NULL,
    response_time_ms integer,
    user_id bigint,
    ip_address inet,
    user_agent text,
    request_body jsonb,
    response_body jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.api_logs OWNER TO postgres;

--
-- Name: api_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.api_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.api_logs_id_seq OWNER TO postgres;

--
-- Name: api_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.api_logs_id_seq OWNED BY public.api_logs.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id bigint,
    action character varying(100) NOT NULL,
    table_name character varying(100),
    record_id bigint,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: certificates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certificates (
    id bigint NOT NULL,
    user_id bigint,
    certificate_type character varying(100) NOT NULL,
    certificate_name character varying(255) NOT NULL,
    issued_date date NOT NULL,
    expiry_date date,
    certificate_data jsonb DEFAULT '{}'::jsonb,
    file_path character varying(500),
    issued_by bigint,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.certificates OWNER TO postgres;

--
-- Name: certificates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certificates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.certificates_id_seq OWNER TO postgres;

--
-- Name: certificates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.certificates_id_seq OWNED BY public.certificates.id;


--
-- Name: content_media; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.content_media (
    id bigint NOT NULL,
    filename character varying NOT NULL,
    original_name character varying NOT NULL,
    mime_type character varying NOT NULL,
    file_size bigint NOT NULL,
    storage_path character varying NOT NULL,
    uploaded_by bigint,
    uploaded_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.content_media OWNER TO postgres;

--
-- Name: content_media_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.content_media_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.content_media_id_seq OWNER TO postgres;

--
-- Name: content_media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.content_media_id_seq OWNED BY public.content_media.id;


--
-- Name: content_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.content_versions (
    id bigint NOT NULL,
    content_id bigint NOT NULL,
    content_type character varying NOT NULL,
    version_number integer NOT NULL,
    content_data jsonb NOT NULL,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now(),
    is_published boolean DEFAULT false,
    published_at timestamp with time zone
);


ALTER TABLE public.content_versions OWNER TO postgres;

--
-- Name: content_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.content_versions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.content_versions_id_seq OWNER TO postgres;

--
-- Name: content_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.content_versions_id_seq OWNED BY public.content_versions.id;


--
-- Name: crew_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crew_assignments (
    id bigint NOT NULL,
    user_id bigint,
    vessel_name character varying NOT NULL,
    "position" character varying NOT NULL,
    start_date date NOT NULL,
    end_date date,
    status character varying DEFAULT 'active'::character varying,
    assigned_by bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crew_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.crew_assignments OWNER TO postgres;

--
-- Name: crew_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crew_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.crew_assignments_id_seq OWNER TO postgres;

--
-- Name: crew_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crew_assignments_id_seq OWNED BY public.crew_assignments.id;


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_logs (
    id bigint NOT NULL,
    recipient_email character varying(255) NOT NULL,
    sender_email character varying(255),
    subject character varying(500),
    email_type character varying(100),
    status character varying(50) DEFAULT 'pending'::character varying,
    sent_at timestamp with time zone,
    error_message text,
    user_id bigint,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.email_logs OWNER TO postgres;

--
-- Name: email_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.email_logs_id_seq OWNER TO postgres;

--
-- Name: email_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_logs_id_seq OWNED BY public.email_logs.id;


--
-- Name: email_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_notifications (
    id bigint NOT NULL,
    user_id bigint,
    email character varying(255) NOT NULL,
    subject character varying(500) NOT NULL,
    body text NOT NULL,
    email_type character varying(100),
    status character varying(50) DEFAULT 'pending'::character varying,
    scheduled_for timestamp with time zone,
    sent_at timestamp with time zone,
    error_message text,
    retry_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.email_notifications OWNER TO postgres;

--
-- Name: email_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.email_notifications_id_seq OWNER TO postgres;

--
-- Name: email_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_notifications_id_seq OWNED BY public.email_notifications.id;


--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.error_logs (
    id bigint NOT NULL,
    error_type character varying(100) NOT NULL,
    error_message text NOT NULL,
    stack_trace text,
    user_id bigint,
    endpoint character varying(500),
    request_data jsonb,
    severity character varying(20) DEFAULT 'error'::character varying,
    resolved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.error_logs OWNER TO postgres;

--
-- Name: error_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.error_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.error_logs_id_seq OWNER TO postgres;

--
-- Name: error_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.error_logs_id_seq OWNED BY public.error_logs.id;


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feature_flags (
    id bigint NOT NULL,
    flag_name character varying(100) NOT NULL,
    description text,
    is_enabled boolean DEFAULT false,
    target_audience jsonb DEFAULT '{}'::jsonb,
    rollout_percentage integer DEFAULT 0,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.feature_flags OWNER TO postgres;

--
-- Name: feature_flags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.feature_flags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.feature_flags_id_seq OWNER TO postgres;

--
-- Name: feature_flags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feature_flags_id_seq OWNED BY public.feature_flags.id;


--
-- Name: file_uploads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.file_uploads (
    id bigint NOT NULL,
    original_filename character varying(255) NOT NULL,
    stored_filename character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100),
    uploaded_by bigint,
    upload_purpose character varying(100),
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.file_uploads OWNER TO postgres;

--
-- Name: file_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.file_uploads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.file_uploads_id_seq OWNER TO postgres;

--
-- Name: file_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.file_uploads_id_seq OWNED BY public.file_uploads.id;


--
-- Name: forms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.forms (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    form_schema jsonb NOT NULL,
    is_active boolean DEFAULT true,
    version integer DEFAULT 1,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.forms OWNER TO postgres;

--
-- Name: forms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.forms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.forms_id_seq OWNER TO postgres;

--
-- Name: forms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.forms_id_seq OWNED BY public.forms.id;


--
-- Name: magic_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.magic_links (
    id bigint NOT NULL,
    user_id bigint,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    used_at timestamp with time zone,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.magic_links OWNER TO postgres;

--
-- Name: magic_links_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.magic_links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.magic_links_id_seq OWNER TO postgres;

--
-- Name: magic_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.magic_links_id_seq OWNED BY public.magic_links.id;


--
-- Name: manager_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.manager_permissions (
    id bigint NOT NULL,
    manager_id bigint,
    permission_type character varying(100) NOT NULL,
    resource_type character varying(100),
    resource_id bigint,
    granted_by bigint,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.manager_permissions OWNER TO postgres;

--
-- Name: manager_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.manager_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.manager_permissions_id_seq OWNER TO postgres;

--
-- Name: manager_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.manager_permissions_id_seq OWNED BY public.manager_permissions.id;


--
-- Name: managers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.managers (
    id bigint NOT NULL,
    user_id bigint,
    department character varying(100),
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.managers OWNER TO postgres;

--
-- Name: managers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.managers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.managers_id_seq OWNER TO postgres;

--
-- Name: managers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.managers_id_seq OWNED BY public.managers.id;


--
-- Name: maritime_terminology; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maritime_terminology (
    id bigint NOT NULL,
    term_key character varying(255) NOT NULL,
    english_term character varying(500) NOT NULL,
    definition text,
    category character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.maritime_terminology OWNER TO postgres;

--
-- Name: maritime_terminology_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maritime_terminology_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.maritime_terminology_id_seq OWNER TO postgres;

--
-- Name: maritime_terminology_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maritime_terminology_id_seq OWNED BY public.maritime_terminology.id;


--
-- Name: mfa_failure_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mfa_failure_log (
    id bigint NOT NULL,
    user_id bigint,
    ip_address inet,
    user_agent text,
    failure_reason character varying NOT NULL,
    attempted_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.mfa_failure_log OWNER TO postgres;

--
-- Name: mfa_failure_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mfa_failure_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mfa_failure_log_id_seq OWNER TO postgres;

--
-- Name: mfa_failure_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mfa_failure_log_id_seq OWNED BY public.mfa_failure_log.id;


--
-- Name: password_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id bigint NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.password_history OWNER TO postgres;

--
-- Name: quiz_content; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_content (
    id bigint NOT NULL,
    question text NOT NULL,
    question_type character varying(50) DEFAULT 'multiple_choice'::character varying,
    options jsonb DEFAULT '[]'::jsonb,
    correct_answer jsonb NOT NULL,
    explanation text,
    difficulty_level character varying(20) DEFAULT 'medium'::character varying,
    category character varying(100),
    is_active boolean DEFAULT true,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.quiz_content OWNER TO postgres;

--
-- Name: quiz_content_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quiz_content_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.quiz_content_id_seq OWNER TO postgres;

--
-- Name: quiz_content_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quiz_content_id_seq OWNED BY public.quiz_content.id;


--
-- Name: quiz_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_history (
    id bigint NOT NULL,
    user_id bigint,
    quiz_session_id uuid DEFAULT gen_random_uuid(),
    total_questions integer NOT NULL,
    correct_answers integer NOT NULL,
    score_percentage numeric(5,2) NOT NULL,
    time_taken_minutes integer,
    completed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.quiz_history OWNER TO postgres;

--
-- Name: quiz_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quiz_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.quiz_history_id_seq OWNER TO postgres;

--
-- Name: quiz_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quiz_history_id_seq OWNED BY public.quiz_history.id;


--
-- Name: quiz_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_results (
    id bigint NOT NULL,
    user_id bigint,
    quiz_content_id bigint,
    user_answer jsonb NOT NULL,
    is_correct boolean NOT NULL,
    time_taken_seconds integer,
    attempt_number integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.quiz_results OWNER TO postgres;

--
-- Name: quiz_results_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quiz_results_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.quiz_results_id_seq OWNER TO postgres;

--
-- Name: quiz_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quiz_results_id_seq OWNED BY public.quiz_results.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id bigint NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    last_used_at timestamp with time zone,
    is_revoked boolean DEFAULT false,
    revoked_at timestamp with time zone,
    device_info jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: security_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id character varying(255) NOT NULL,
    type character varying(100) NOT NULL,
    severity character varying(20) NOT NULL,
    user_id bigint,
    ip_address inet,
    user_agent text,
    details jsonb DEFAULT '{}'::jsonb,
    threats text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT security_events_severity_check CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[])))
);


ALTER TABLE public.security_events OWNER TO postgres;

--
-- Name: system_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_notifications (
    id bigint NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    notification_type character varying(50) DEFAULT 'info'::character varying,
    target_audience character varying(50) DEFAULT 'all'::character varying,
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.system_notifications OWNER TO postgres;

--
-- Name: system_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.system_notifications_id_seq OWNER TO postgres;

--
-- Name: system_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_notifications_id_seq OWNED BY public.system_notifications.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(255) NOT NULL,
    value text,
    description text,
    category character varying(100) DEFAULT 'general'::character varying,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: token_blacklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token_blacklist (
    id bigint NOT NULL,
    token_hash character varying(255) NOT NULL,
    user_id bigint,
    reason character varying(100),
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.token_blacklist OWNER TO postgres;

--
-- Name: token_blacklist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.token_blacklist_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.token_blacklist_id_seq OWNER TO postgres;

--
-- Name: token_blacklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.token_blacklist_id_seq OWNED BY public.token_blacklist.id;


--
-- Name: training_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.training_items (
    id bigint NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    content_type character varying(50) NOT NULL,
    content_data jsonb DEFAULT '{}'::jsonb,
    duration_minutes integer,
    difficulty_level character varying(20) DEFAULT 'beginner'::character varying,
    category character varying(100),
    is_mandatory boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.training_items OWNER TO postgres;

--
-- Name: training_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.training_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.training_items_id_seq OWNER TO postgres;

--
-- Name: training_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.training_items_id_seq OWNED BY public.training_items.id;


--
-- Name: training_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.training_sessions (
    id bigint NOT NULL,
    user_id bigint,
    training_item_id bigint,
    status character varying(20) DEFAULT 'not_started'::character varying,
    progress_percentage integer DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    score integer,
    time_spent_minutes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.training_sessions OWNER TO postgres;

--
-- Name: training_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.training_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.training_sessions_id_seq OWNER TO postgres;

--
-- Name: training_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.training_sessions_id_seq OWNED BY public.training_sessions.id;


--
-- Name: translation_memory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.translation_memory (
    id bigint NOT NULL,
    source_text text NOT NULL,
    target_text text NOT NULL,
    source_language character varying(10) NOT NULL,
    target_language character varying(10) NOT NULL,
    context character varying(255),
    quality_score numeric(3,2),
    created_by bigint,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.translation_memory OWNER TO postgres;

--
-- Name: translation_memory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.translation_memory_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.translation_memory_id_seq OWNER TO postgres;

--
-- Name: translation_memory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.translation_memory_id_seq OWNED BY public.translation_memory.id;


--
-- Name: user_mfa_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_mfa_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id bigint,
    secret text NOT NULL,
    backup_codes text[],
    enabled boolean DEFAULT false,
    setup_completed_at timestamp without time zone,
    last_used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_mfa_settings OWNER TO postgres;

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id character varying(255) NOT NULL,
    user_id bigint NOT NULL,
    ip_address inet NOT NULL,
    user_agent text,
    device_fingerprint character varying(32),
    expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    last_activity timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    terminated_at timestamp with time zone,
    termination_reason character varying(50),
    CONSTRAINT valid_termination CHECK ((((is_active = true) AND (terminated_at IS NULL) AND (termination_reason IS NULL)) OR ((is_active = false) AND (terminated_at IS NOT NULL) AND (termination_reason IS NOT NULL))))
);


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    role character varying(50) DEFAULT 'crew'::character varying NOT NULL,
    "position" character varying(100),
    preferred_language character varying(10) DEFAULT 'en'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    is_active boolean DEFAULT true,
    password_hash text,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: workflow_instances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_instances (
    id bigint NOT NULL,
    workflow_id bigint,
    user_id bigint,
    status character varying(20) DEFAULT 'not_started'::character varying,
    current_phase_id bigint,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.workflow_instances OWNER TO postgres;

--
-- Name: workflow_instances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflow_instances_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.workflow_instances_id_seq OWNER TO postgres;

--
-- Name: workflow_instances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflow_instances_id_seq OWNED BY public.workflow_instances.id;


--
-- Name: workflow_phases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_phases (
    id bigint NOT NULL,
    workflow_id bigint,
    name character varying(255) NOT NULL,
    description text,
    phase_order integer NOT NULL,
    is_required boolean DEFAULT true,
    estimated_duration_minutes integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.workflow_phases OWNER TO postgres;

--
-- Name: workflow_phases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflow_phases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.workflow_phases_id_seq OWNER TO postgres;

--
-- Name: workflow_phases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflow_phases_id_seq OWNED BY public.workflow_phases.id;


--
-- Name: workflow_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_progress (
    id bigint NOT NULL,
    workflow_instance_id bigint,
    phase_id bigint,
    status character varying(20) DEFAULT 'not_started'::character varying,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.workflow_progress OWNER TO postgres;

--
-- Name: workflow_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflow_progress_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.workflow_progress_id_seq OWNER TO postgres;

--
-- Name: workflow_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflow_progress_id_seq OWNED BY public.workflow_progress.id;


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflows (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(100),
    is_active boolean DEFAULT true,
    is_mandatory boolean DEFAULT false,
    estimated_duration_minutes integer,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.workflows OWNER TO postgres;

--
-- Name: workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflows_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.workflows_id_seq OWNER TO postgres;

--
-- Name: workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflows_id_seq OWNED BY public.workflows.id;


--
-- Name: api_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_logs ALTER COLUMN id SET DEFAULT nextval('public.api_logs_id_seq'::regclass);


--
-- Name: certificates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates ALTER COLUMN id SET DEFAULT nextval('public.certificates_id_seq'::regclass);


--
-- Name: content_media id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_media ALTER COLUMN id SET DEFAULT nextval('public.content_media_id_seq'::regclass);


--
-- Name: content_versions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_versions ALTER COLUMN id SET DEFAULT nextval('public.content_versions_id_seq'::regclass);


--
-- Name: crew_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crew_assignments ALTER COLUMN id SET DEFAULT nextval('public.crew_assignments_id_seq'::regclass);


--
-- Name: email_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs ALTER COLUMN id SET DEFAULT nextval('public.email_logs_id_seq'::regclass);


--
-- Name: email_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_notifications ALTER COLUMN id SET DEFAULT nextval('public.email_notifications_id_seq'::regclass);


--
-- Name: error_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.error_logs ALTER COLUMN id SET DEFAULT nextval('public.error_logs_id_seq'::regclass);


--
-- Name: feature_flags id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feature_flags ALTER COLUMN id SET DEFAULT nextval('public.feature_flags_id_seq'::regclass);


--
-- Name: file_uploads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_uploads ALTER COLUMN id SET DEFAULT nextval('public.file_uploads_id_seq'::regclass);


--
-- Name: forms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms ALTER COLUMN id SET DEFAULT nextval('public.forms_id_seq'::regclass);


--
-- Name: magic_links id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.magic_links ALTER COLUMN id SET DEFAULT nextval('public.magic_links_id_seq'::regclass);


--
-- Name: manager_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manager_permissions ALTER COLUMN id SET DEFAULT nextval('public.manager_permissions_id_seq'::regclass);


--
-- Name: managers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.managers ALTER COLUMN id SET DEFAULT nextval('public.managers_id_seq'::regclass);


--
-- Name: maritime_terminology id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maritime_terminology ALTER COLUMN id SET DEFAULT nextval('public.maritime_terminology_id_seq'::regclass);


--
-- Name: mfa_failure_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfa_failure_log ALTER COLUMN id SET DEFAULT nextval('public.mfa_failure_log_id_seq'::regclass);


--
-- Name: quiz_content id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_content ALTER COLUMN id SET DEFAULT nextval('public.quiz_content_id_seq'::regclass);


--
-- Name: quiz_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_history ALTER COLUMN id SET DEFAULT nextval('public.quiz_history_id_seq'::regclass);


--
-- Name: quiz_results id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_results ALTER COLUMN id SET DEFAULT nextval('public.quiz_results_id_seq'::regclass);


--
-- Name: system_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_notifications ALTER COLUMN id SET DEFAULT nextval('public.system_notifications_id_seq'::regclass);


--
-- Name: token_blacklist id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist ALTER COLUMN id SET DEFAULT nextval('public.token_blacklist_id_seq'::regclass);


--
-- Name: training_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_items ALTER COLUMN id SET DEFAULT nextval('public.training_items_id_seq'::regclass);


--
-- Name: training_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_sessions ALTER COLUMN id SET DEFAULT nextval('public.training_sessions_id_seq'::regclass);


--
-- Name: translation_memory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.translation_memory ALTER COLUMN id SET DEFAULT nextval('public.translation_memory_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: workflow_instances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_instances ALTER COLUMN id SET DEFAULT nextval('public.workflow_instances_id_seq'::regclass);


--
-- Name: workflow_phases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_phases ALTER COLUMN id SET DEFAULT nextval('public.workflow_phases_id_seq'::regclass);


--
-- Name: workflow_progress id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_progress ALTER COLUMN id SET DEFAULT nextval('public.workflow_progress_id_seq'::regclass);


--
-- Name: workflows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows ALTER COLUMN id SET DEFAULT nextval('public.workflows_id_seq'::regclass);


--
-- Data for Name: api_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_logs (id, method, endpoint, status_code, response_time_ms, user_id, ip_address, user_agent, request_body, response_body, created_at) FROM stdin;
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: certificates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certificates (id, user_id, certificate_type, certificate_name, issued_date, expiry_date, certificate_data, file_path, issued_by, created_at) FROM stdin;
\.


--
-- Data for Name: content_media; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.content_media (id, filename, original_name, mime_type, file_size, storage_path, uploaded_by, uploaded_at, metadata) FROM stdin;
\.


--
-- Data for Name: content_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.content_versions (id, content_id, content_type, version_number, content_data, created_by, created_at, is_published, published_at) FROM stdin;
\.


--
-- Data for Name: crew_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.crew_assignments (id, user_id, vessel_name, "position", start_date, end_date, status, assigned_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_logs (id, recipient_email, sender_email, subject, email_type, status, sent_at, error_message, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: email_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_notifications (id, user_id, email, subject, body, email_type, status, scheduled_for, sent_at, error_message, retry_count, created_at) FROM stdin;
\.


--
-- Data for Name: error_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.error_logs (id, error_type, error_message, stack_trace, user_id, endpoint, request_data, severity, resolved, created_at) FROM stdin;
\.


--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feature_flags (id, flag_name, description, is_enabled, target_audience, rollout_percentage, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: file_uploads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.file_uploads (id, original_filename, stored_filename, file_path, file_size, mime_type, uploaded_by, upload_purpose, is_public, created_at) FROM stdin;
\.


--
-- Data for Name: forms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.forms (id, name, description, form_schema, is_active, version, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: magic_links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.magic_links (id, user_id, token, expires_at, used, used_at, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: manager_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.manager_permissions (id, manager_id, permission_type, resource_type, resource_id, granted_by, created_at) FROM stdin;
\.


--
-- Data for Name: managers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.managers (id, user_id, department, permissions, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: maritime_terminology; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maritime_terminology (id, term_key, english_term, definition, category, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_failure_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mfa_failure_log (id, user_id, ip_address, user_agent, failure_reason, attempted_at) FROM stdin;
\.


--
-- Data for Name: password_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_history (id, user_id, password_hash, created_at) FROM stdin;
\.


--
-- Data for Name: quiz_content; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz_content (id, question, question_type, options, correct_answer, explanation, difficulty_level, category, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quiz_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz_history (id, user_id, quiz_session_id, total_questions, correct_answers, score_percentage, time_taken_minutes, completed_at) FROM stdin;
\.


--
-- Data for Name: quiz_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz_results (id, user_id, quiz_content_id, user_answer, is_correct, time_taken_seconds, attempt_number, created_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token_hash, expires_at, created_at, last_used_at, is_revoked, revoked_at, device_info) FROM stdin;
\.


--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.security_events (id, event_id, type, severity, user_id, ip_address, user_agent, details, threats, created_at, updated_at) FROM stdin;
7c2e616d-c295-410c-8ef2-ea84b11f635a	security_threat_1755588327759_5as5ywx1d	security_threat_detected	high	\N	172.20.0.1	curl/7.81.0	{"url": "/api/auth/admin-login", "method": "POST", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T07:25:27.759Z", "request_data": {"url": "/api/auth/admin-login", "body": "{\\"email\\":\\"admin@maritime-onboarding.local\\",\\"password\\":\\"password\\"}", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"content-type\\":\\"application/json\\",\\"content-length\\":\\"65\\",\\"x-request-id\\":\\"req_b0e63a9dd3f4\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 07:25:27.791265+00	2025-08-19 07:25:27.791265+00
925b8853-1636-4d2f-b866-373dfeb9b8a1	security_threat_1755588368373_dnbkfy7sn	security_threat_detected	high	\N	172.20.0.1	curl/7.81.0	{"url": "/api/auth/admin-login", "method": "POST", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T07:26:08.373Z", "request_data": {"url": "/api/auth/admin-login", "body": "{\\"email\\":\\"admin@maritime-onboarding.local\\",\\"password\\":\\"password\\"}", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"content-type\\":\\"application/json\\",\\"content-length\\":\\"65\\",\\"x-request-id\\":\\"req_4c466ed1d26c\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 07:26:08.374625+00	2025-08-19 07:26:08.374625+00
5dbfb925-99cb-4116-a4a6-8ccb81b06ccf	security_threat_1755588485544_s46va2h78	security_threat_detected	high	\N	172.20.0.1	curl/7.81.0	{"url": "/api/auth/admin-login", "method": "POST", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T07:28:05.544Z", "request_data": {"url": "/api/auth/admin-login", "body": "{\\"email\\":\\"admin@maritime-onboarding.local\\",\\"password\\":\\"password\\"}", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"content-type\\":\\"application/json\\",\\"content-length\\":\\"65\\",\\"x-request-id\\":\\"req_950b3283afda\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 07:28:05.566181+00	2025-08-19 07:28:05.566181+00
\.


--
-- Data for Name: system_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_notifications (id, title, message, notification_type, target_audience, is_active, expires_at, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, key, value, description, category, is_public, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: token_blacklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.token_blacklist (id, token_hash, user_id, reason, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: training_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.training_items (id, title, description, content_type, content_data, duration_minutes, difficulty_level, category, is_mandatory, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: training_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.training_sessions (id, user_id, training_item_id, status, progress_percentage, started_at, completed_at, score, time_spent_minutes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: translation_memory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.translation_memory (id, source_text, target_text, source_language, target_language, context, quality_score, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: user_mfa_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_mfa_settings (id, user_id, secret, backup_codes, enabled, setup_completed_at, last_used_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_sessions (id, session_id, user_id, ip_address, user_agent, device_fingerprint, expires_at, is_active, last_activity, created_at, terminated_at, termination_reason) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, first_name, last_name, role, "position", preferred_language, status, is_active, password_hash, last_login, created_at, updated_at) FROM stdin;
1	admin@maritime-onboarding.local	\N	\N	admin	\N	en	active	t	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	\N	2025-08-19 07:25:59.407744+00	2025-08-19 07:25:59.407744+00
\.


--
-- Data for Name: workflow_instances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflow_instances (id, workflow_id, user_id, status, current_phase_id, started_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: workflow_phases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflow_phases (id, workflow_id, name, description, phase_order, is_required, estimated_duration_minutes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: workflow_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflow_progress (id, workflow_instance_id, phase_id, status, started_at, completed_at, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: workflows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflows (id, name, description, category, is_active, is_mandatory, estimated_duration_minutes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Name: api_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_logs_id_seq', 1, false);


--
-- Name: certificates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certificates_id_seq', 1, false);


--
-- Name: content_media_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_media_id_seq', 1, false);


--
-- Name: content_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_versions_id_seq', 1, false);


--
-- Name: crew_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.crew_assignments_id_seq', 1, false);


--
-- Name: email_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_logs_id_seq', 1, false);


--
-- Name: email_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_notifications_id_seq', 1, false);


--
-- Name: error_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.error_logs_id_seq', 1, false);


--
-- Name: feature_flags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.feature_flags_id_seq', 1, false);


--
-- Name: file_uploads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.file_uploads_id_seq', 1, false);


--
-- Name: forms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.forms_id_seq', 1, false);


--
-- Name: magic_links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.magic_links_id_seq', 1, false);


--
-- Name: manager_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.manager_permissions_id_seq', 1, false);


--
-- Name: managers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.managers_id_seq', 1, false);


--
-- Name: maritime_terminology_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maritime_terminology_id_seq', 1, false);


--
-- Name: mfa_failure_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mfa_failure_log_id_seq', 1, false);


--
-- Name: quiz_content_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quiz_content_id_seq', 1, false);


--
-- Name: quiz_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quiz_history_id_seq', 1, false);


--
-- Name: quiz_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quiz_results_id_seq', 1, false);


--
-- Name: system_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_notifications_id_seq', 1, false);


--
-- Name: token_blacklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.token_blacklist_id_seq', 1, false);


--
-- Name: training_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.training_items_id_seq', 1, false);


--
-- Name: training_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.training_sessions_id_seq', 1, false);


--
-- Name: translation_memory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.translation_memory_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: workflow_instances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workflow_instances_id_seq', 1, false);


--
-- Name: workflow_phases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workflow_phases_id_seq', 1, false);


--
-- Name: workflow_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workflow_progress_id_seq', 1, false);


--
-- Name: workflows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workflows_id_seq', 1, false);


--
-- Name: api_logs api_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_logs
    ADD CONSTRAINT api_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: content_media content_media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_media
    ADD CONSTRAINT content_media_pkey PRIMARY KEY (id);


--
-- Name: content_versions content_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_versions
    ADD CONSTRAINT content_versions_pkey PRIMARY KEY (id);


--
-- Name: crew_assignments crew_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crew_assignments
    ADD CONSTRAINT crew_assignments_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: email_notifications email_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_pkey PRIMARY KEY (id);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_flag_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_flag_name_key UNIQUE (flag_name);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: file_uploads file_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_uploads
    ADD CONSTRAINT file_uploads_pkey PRIMARY KEY (id);


--
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- Name: magic_links magic_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.magic_links
    ADD CONSTRAINT magic_links_pkey PRIMARY KEY (id);


--
-- Name: magic_links magic_links_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.magic_links
    ADD CONSTRAINT magic_links_token_key UNIQUE (token);


--
-- Name: manager_permissions manager_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manager_permissions
    ADD CONSTRAINT manager_permissions_pkey PRIMARY KEY (id);


--
-- Name: managers managers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.managers
    ADD CONSTRAINT managers_pkey PRIMARY KEY (id);


--
-- Name: managers managers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.managers
    ADD CONSTRAINT managers_user_id_key UNIQUE (user_id);


--
-- Name: maritime_terminology maritime_terminology_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maritime_terminology
    ADD CONSTRAINT maritime_terminology_pkey PRIMARY KEY (id);


--
-- Name: maritime_terminology maritime_terminology_term_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maritime_terminology
    ADD CONSTRAINT maritime_terminology_term_key_key UNIQUE (term_key);


--
-- Name: mfa_failure_log mfa_failure_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfa_failure_log
    ADD CONSTRAINT mfa_failure_log_pkey PRIMARY KEY (id);


--
-- Name: password_history password_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_pkey PRIMARY KEY (id);


--
-- Name: quiz_content quiz_content_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_content
    ADD CONSTRAINT quiz_content_pkey PRIMARY KEY (id);


--
-- Name: quiz_history quiz_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_history
    ADD CONSTRAINT quiz_history_pkey PRIMARY KEY (id);


--
-- Name: quiz_results quiz_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_results
    ADD CONSTRAINT quiz_results_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: security_events security_events_event_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_event_id_key UNIQUE (event_id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: system_notifications system_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_notifications
    ADD CONSTRAINT system_notifications_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_key UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist token_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist token_blacklist_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_token_hash_key UNIQUE (token_hash);


--
-- Name: training_items training_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_items
    ADD CONSTRAINT training_items_pkey PRIMARY KEY (id);


--
-- Name: training_sessions training_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT training_sessions_pkey PRIMARY KEY (id);


--
-- Name: translation_memory translation_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.translation_memory
    ADD CONSTRAINT translation_memory_pkey PRIMARY KEY (id);


--
-- Name: user_mfa_settings user_mfa_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_mfa_settings
    ADD CONSTRAINT user_mfa_settings_pkey PRIMARY KEY (id);


--
-- Name: user_mfa_settings user_mfa_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_mfa_settings
    ADD CONSTRAINT user_mfa_settings_user_id_key UNIQUE (user_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_id_key UNIQUE (session_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workflow_instances workflow_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_pkey PRIMARY KEY (id);


--
-- Name: workflow_phases workflow_phases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_phases
    ADD CONSTRAINT workflow_phases_pkey PRIMARY KEY (id);


--
-- Name: workflow_progress workflow_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_progress
    ADD CONSTRAINT workflow_progress_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: idx_api_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_logs_created_at ON public.api_logs USING btree (created_at);


--
-- Name: idx_api_logs_endpoint; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_logs_endpoint ON public.api_logs USING btree (endpoint);


--
-- Name: idx_api_logs_status_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_logs_status_code ON public.api_logs USING btree (status_code);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at);


--
-- Name: idx_audit_log_table_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_table_name ON public.audit_log USING btree (table_name);


--
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id);


--
-- Name: idx_content_media_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_content_media_uploaded_by ON public.content_media USING btree (uploaded_by);


--
-- Name: idx_content_versions_content_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_content_versions_content_id ON public.content_versions USING btree (content_id, version_number);


--
-- Name: idx_crew_assignments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crew_assignments_status ON public.crew_assignments USING btree (status);


--
-- Name: idx_crew_assignments_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crew_assignments_user_id ON public.crew_assignments USING btree (user_id);


--
-- Name: idx_crew_assignments_vessel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crew_assignments_vessel ON public.crew_assignments USING btree (vessel_name);


--
-- Name: idx_email_logs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_logs_status ON public.email_logs USING btree (status);


--
-- Name: idx_email_notifications_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_notifications_status ON public.email_notifications USING btree (status);


--
-- Name: idx_error_logs_error_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_error_logs_error_type ON public.error_logs USING btree (error_type);


--
-- Name: idx_error_logs_resolved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_error_logs_resolved ON public.error_logs USING btree (resolved);


--
-- Name: idx_feature_flags_flag_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feature_flags_flag_name ON public.feature_flags USING btree (flag_name);


--
-- Name: idx_feature_flags_is_enabled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feature_flags_is_enabled ON public.feature_flags USING btree (is_enabled);


--
-- Name: idx_magic_links_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_magic_links_expires_at ON public.magic_links USING btree (expires_at);


--
-- Name: idx_magic_links_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_magic_links_token ON public.magic_links USING btree (token);


--
-- Name: idx_magic_links_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_magic_links_user_id ON public.magic_links USING btree (user_id);


--
-- Name: idx_mfa_failure_log_user_attempted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mfa_failure_log_user_attempted ON public.mfa_failure_log USING btree (user_id, attempted_at);


--
-- Name: idx_quiz_content_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quiz_content_category ON public.quiz_content USING btree (category);


--
-- Name: idx_quiz_content_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quiz_content_is_active ON public.quiz_content USING btree (is_active);


--
-- Name: idx_quiz_history_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quiz_history_user_id ON public.quiz_history USING btree (user_id);


--
-- Name: idx_quiz_results_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quiz_results_user_id ON public.quiz_results USING btree (user_id);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_security_events_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_severity ON public.security_events USING btree (severity);


--
-- Name: idx_security_events_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_type ON public.security_events USING btree (type);


--
-- Name: idx_security_events_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_user_id ON public.security_events USING btree (user_id);


--
-- Name: idx_system_settings_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_settings_category ON public.system_settings USING btree (category);


--
-- Name: idx_system_settings_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_settings_key ON public.system_settings USING btree (key);


--
-- Name: idx_token_blacklist_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_blacklist_token_hash ON public.token_blacklist USING btree (token_hash);


--
-- Name: idx_training_items_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_training_items_category ON public.training_items USING btree (category);


--
-- Name: idx_training_items_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_training_items_is_active ON public.training_items USING btree (is_active);


--
-- Name: idx_training_sessions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_training_sessions_status ON public.training_sessions USING btree (status);


--
-- Name: idx_training_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_training_sessions_user_id ON public.training_sessions USING btree (user_id);


--
-- Name: idx_user_mfa_settings_enabled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_mfa_settings_enabled ON public.user_mfa_settings USING btree (enabled);


--
-- Name: idx_user_mfa_settings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_mfa_settings_user_id ON public.user_mfa_settings USING btree (user_id);


--
-- Name: idx_user_sessions_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_session_id ON public.user_sessions USING btree (session_id);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_workflow_instances_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workflow_instances_status ON public.workflow_instances USING btree (status);


--
-- Name: idx_workflow_instances_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workflow_instances_user_id ON public.workflow_instances USING btree (user_id);


--
-- Name: idx_workflows_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workflows_category ON public.workflows USING btree (category);


--
-- Name: idx_workflows_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workflows_is_active ON public.workflows USING btree (is_active);


--
-- Name: crew_assignments update_crew_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_crew_assignments_updated_at BEFORE UPDATE ON public.crew_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: feature_flags update_feature_flags_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: managers update_managers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_managers_updated_at BEFORE UPDATE ON public.managers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quiz_content update_quiz_content_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_quiz_content_updated_at BEFORE UPDATE ON public.quiz_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_settings update_system_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: training_items update_training_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_training_items_updated_at BEFORE UPDATE ON public.training_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: training_sessions update_training_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_training_sessions_updated_at BEFORE UPDATE ON public.training_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflow_instances update_workflow_instances_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_workflow_instances_updated_at BEFORE UPDATE ON public.workflow_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflow_phases update_workflow_phases_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_workflow_phases_updated_at BEFORE UPDATE ON public.workflow_phases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflow_progress update_workflow_progress_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_workflow_progress_updated_at BEFORE UPDATE ON public.workflow_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflows update_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_logs api_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_logs
    ADD CONSTRAINT api_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: certificates certificates_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id);


--
-- Name: certificates certificates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: content_media content_media_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_media
    ADD CONSTRAINT content_media_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: content_versions content_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_versions
    ADD CONSTRAINT content_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: crew_assignments crew_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crew_assignments
    ADD CONSTRAINT crew_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: crew_assignments crew_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crew_assignments
    ADD CONSTRAINT crew_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: email_logs email_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: email_notifications email_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: error_logs error_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: feature_flags feature_flags_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: file_uploads file_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_uploads
    ADD CONSTRAINT file_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: forms forms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: magic_links magic_links_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.magic_links
    ADD CONSTRAINT magic_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: manager_permissions manager_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manager_permissions
    ADD CONSTRAINT manager_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: manager_permissions manager_permissions_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manager_permissions
    ADD CONSTRAINT manager_permissions_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.managers(id) ON DELETE CASCADE;


--
-- Name: managers managers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.managers
    ADD CONSTRAINT managers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: mfa_failure_log mfa_failure_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfa_failure_log
    ADD CONSTRAINT mfa_failure_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: password_history password_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: quiz_content quiz_content_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_content
    ADD CONSTRAINT quiz_content_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: quiz_history quiz_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_history
    ADD CONSTRAINT quiz_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: quiz_results quiz_results_quiz_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_results
    ADD CONSTRAINT quiz_results_quiz_content_id_fkey FOREIGN KEY (quiz_content_id) REFERENCES public.quiz_content(id) ON DELETE CASCADE;


--
-- Name: quiz_results quiz_results_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_results
    ADD CONSTRAINT quiz_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: system_notifications system_notifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_notifications
    ADD CONSTRAINT system_notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: token_blacklist token_blacklist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: training_items training_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_items
    ADD CONSTRAINT training_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: training_sessions training_sessions_training_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT training_sessions_training_item_id_fkey FOREIGN KEY (training_item_id) REFERENCES public.training_items(id) ON DELETE CASCADE;


--
-- Name: training_sessions training_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_sessions
    ADD CONSTRAINT training_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: translation_memory translation_memory_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.translation_memory
    ADD CONSTRAINT translation_memory_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: user_mfa_settings user_mfa_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_mfa_settings
    ADD CONSTRAINT user_mfa_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workflow_instances workflow_instances_current_phase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_current_phase_id_fkey FOREIGN KEY (current_phase_id) REFERENCES public.workflow_phases(id);


--
-- Name: workflow_instances workflow_instances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workflow_instances workflow_instances_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflow_phases workflow_phases_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_phases
    ADD CONSTRAINT workflow_phases_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflow_progress workflow_progress_phase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_progress
    ADD CONSTRAINT workflow_progress_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.workflow_phases(id) ON DELETE CASCADE;


--
-- Name: workflow_progress workflow_progress_workflow_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_progress
    ADD CONSTRAINT workflow_progress_workflow_instance_id_fkey FOREIGN KEY (workflow_instance_id) REFERENCES public.workflow_instances(id) ON DELETE CASCADE;


--
-- Name: workflows workflows_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea) TO anon;
GRANT ALL ON FUNCTION public.armor(bytea) TO authenticated;
GRANT ALL ON FUNCTION public.armor(bytea) TO service_role;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea, text[], text[]) TO anon;
GRANT ALL ON FUNCTION public.armor(bytea, text[], text[]) TO authenticated;
GRANT ALL ON FUNCTION public.armor(bytea, text[], text[]) TO service_role;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.crypt(text, text) TO anon;
GRANT ALL ON FUNCTION public.crypt(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.crypt(text, text) TO service_role;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.dearmor(text) TO anon;
GRANT ALL ON FUNCTION public.dearmor(text) TO authenticated;
GRANT ALL ON FUNCTION public.dearmor(text) TO service_role;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt(bytea, bytea, text) TO anon;
GRANT ALL ON FUNCTION public.decrypt(bytea, bytea, text) TO authenticated;
GRANT ALL ON FUNCTION public.decrypt(bytea, bytea, text) TO service_role;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt_iv(bytea, bytea, bytea, text) TO anon;
GRANT ALL ON FUNCTION public.decrypt_iv(bytea, bytea, bytea, text) TO authenticated;
GRANT ALL ON FUNCTION public.decrypt_iv(bytea, bytea, bytea, text) TO service_role;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(bytea, text) TO anon;
GRANT ALL ON FUNCTION public.digest(bytea, text) TO authenticated;
GRANT ALL ON FUNCTION public.digest(bytea, text) TO service_role;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(text, text) TO anon;
GRANT ALL ON FUNCTION public.digest(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.digest(text, text) TO service_role;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt(bytea, bytea, text) TO anon;
GRANT ALL ON FUNCTION public.encrypt(bytea, bytea, text) TO authenticated;
GRANT ALL ON FUNCTION public.encrypt(bytea, bytea, text) TO service_role;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt_iv(bytea, bytea, bytea, text) TO anon;
GRANT ALL ON FUNCTION public.encrypt_iv(bytea, bytea, bytea, text) TO authenticated;
GRANT ALL ON FUNCTION public.encrypt_iv(bytea, bytea, bytea, text) TO service_role;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_bytes(integer) TO anon;
GRANT ALL ON FUNCTION public.gen_random_bytes(integer) TO authenticated;
GRANT ALL ON FUNCTION public.gen_random_bytes(integer) TO service_role;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_uuid() TO anon;
GRANT ALL ON FUNCTION public.gen_random_uuid() TO authenticated;
GRANT ALL ON FUNCTION public.gen_random_uuid() TO service_role;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text) TO anon;
GRANT ALL ON FUNCTION public.gen_salt(text) TO authenticated;
GRANT ALL ON FUNCTION public.gen_salt(text) TO service_role;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text, integer) TO anon;
GRANT ALL ON FUNCTION public.gen_salt(text, integer) TO authenticated;
GRANT ALL ON FUNCTION public.gen_salt(text, integer) TO service_role;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(bytea, bytea, text) TO anon;
GRANT ALL ON FUNCTION public.hmac(bytea, bytea, text) TO authenticated;
GRANT ALL ON FUNCTION public.hmac(bytea, bytea, text) TO service_role;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(text, text, text) TO anon;
GRANT ALL ON FUNCTION public.hmac(text, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.hmac(text, text, text) TO service_role;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text) TO anon;
GRANT ALL ON FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text) TO service_role;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_key_id(bytea) TO anon;
GRANT ALL ON FUNCTION public.pgp_key_id(bytea) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_key_id(bytea) TO service_role;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea) TO anon;
GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea) TO service_role;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text) TO service_role;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text) TO service_role;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea) TO anon;
GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea) TO service_role;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text) TO service_role;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO service_role;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea) TO anon;
GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea) TO service_role;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea, text) TO service_role;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea) TO anon;
GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea) TO service_role;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text) TO service_role;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text) TO service_role;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text, text) TO service_role;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text) TO service_role;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text) TO service_role;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text) TO service_role;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text, text) TO service_role;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text) TO service_role;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text) TO anon;
GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text) TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v1() TO anon;
GRANT ALL ON FUNCTION public.uuid_generate_v1() TO authenticated;
GRANT ALL ON FUNCTION public.uuid_generate_v1() TO service_role;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v1mc() TO anon;
GRANT ALL ON FUNCTION public.uuid_generate_v1mc() TO authenticated;
GRANT ALL ON FUNCTION public.uuid_generate_v1mc() TO service_role;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v3(namespace uuid, name text) TO anon;
GRANT ALL ON FUNCTION public.uuid_generate_v3(namespace uuid, name text) TO authenticated;
GRANT ALL ON FUNCTION public.uuid_generate_v3(namespace uuid, name text) TO service_role;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v4() TO anon;
GRANT ALL ON FUNCTION public.uuid_generate_v4() TO authenticated;
GRANT ALL ON FUNCTION public.uuid_generate_v4() TO service_role;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v5(namespace uuid, name text) TO anon;
GRANT ALL ON FUNCTION public.uuid_generate_v5(namespace uuid, name text) TO authenticated;
GRANT ALL ON FUNCTION public.uuid_generate_v5(namespace uuid, name text) TO service_role;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_nil() TO anon;
GRANT ALL ON FUNCTION public.uuid_nil() TO authenticated;
GRANT ALL ON FUNCTION public.uuid_nil() TO service_role;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_ns_dns() TO anon;
GRANT ALL ON FUNCTION public.uuid_ns_dns() TO authenticated;
GRANT ALL ON FUNCTION public.uuid_ns_dns() TO service_role;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_ns_oid() TO anon;
GRANT ALL ON FUNCTION public.uuid_ns_oid() TO authenticated;
GRANT ALL ON FUNCTION public.uuid_ns_oid() TO service_role;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_ns_url() TO anon;
GRANT ALL ON FUNCTION public.uuid_ns_url() TO authenticated;
GRANT ALL ON FUNCTION public.uuid_ns_url() TO service_role;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_ns_x500() TO anon;
GRANT ALL ON FUNCTION public.uuid_ns_x500() TO authenticated;
GRANT ALL ON FUNCTION public.uuid_ns_x500() TO service_role;


--
-- Name: TABLE api_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.api_logs TO anon;
GRANT ALL ON TABLE public.api_logs TO authenticated;
GRANT ALL ON TABLE public.api_logs TO service_role;


--
-- Name: SEQUENCE api_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.api_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.api_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.api_logs_id_seq TO service_role;


--
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_log TO anon;
GRANT ALL ON TABLE public.audit_log TO authenticated;
GRANT ALL ON TABLE public.audit_log TO service_role;


--
-- Name: TABLE certificates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.certificates TO anon;
GRANT ALL ON TABLE public.certificates TO authenticated;
GRANT ALL ON TABLE public.certificates TO service_role;


--
-- Name: SEQUENCE certificates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.certificates_id_seq TO anon;
GRANT ALL ON SEQUENCE public.certificates_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.certificates_id_seq TO service_role;


--
-- Name: TABLE content_media; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.content_media TO anon;
GRANT ALL ON TABLE public.content_media TO authenticated;
GRANT ALL ON TABLE public.content_media TO service_role;


--
-- Name: SEQUENCE content_media_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.content_media_id_seq TO anon;
GRANT ALL ON SEQUENCE public.content_media_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.content_media_id_seq TO service_role;


--
-- Name: TABLE content_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.content_versions TO anon;
GRANT ALL ON TABLE public.content_versions TO authenticated;
GRANT ALL ON TABLE public.content_versions TO service_role;


--
-- Name: SEQUENCE content_versions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.content_versions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.content_versions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.content_versions_id_seq TO service_role;


--
-- Name: TABLE crew_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.crew_assignments TO anon;
GRANT ALL ON TABLE public.crew_assignments TO authenticated;
GRANT ALL ON TABLE public.crew_assignments TO service_role;


--
-- Name: SEQUENCE crew_assignments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.crew_assignments_id_seq TO anon;
GRANT ALL ON SEQUENCE public.crew_assignments_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.crew_assignments_id_seq TO service_role;


--
-- Name: TABLE email_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.email_logs TO anon;
GRANT ALL ON TABLE public.email_logs TO authenticated;
GRANT ALL ON TABLE public.email_logs TO service_role;


--
-- Name: SEQUENCE email_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.email_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.email_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.email_logs_id_seq TO service_role;


--
-- Name: TABLE email_notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.email_notifications TO anon;
GRANT ALL ON TABLE public.email_notifications TO authenticated;
GRANT ALL ON TABLE public.email_notifications TO service_role;


--
-- Name: SEQUENCE email_notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.email_notifications_id_seq TO anon;
GRANT ALL ON SEQUENCE public.email_notifications_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.email_notifications_id_seq TO service_role;


--
-- Name: TABLE error_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.error_logs TO anon;
GRANT ALL ON TABLE public.error_logs TO authenticated;
GRANT ALL ON TABLE public.error_logs TO service_role;


--
-- Name: SEQUENCE error_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.error_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.error_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.error_logs_id_seq TO service_role;


--
-- Name: TABLE feature_flags; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.feature_flags TO anon;
GRANT ALL ON TABLE public.feature_flags TO authenticated;
GRANT ALL ON TABLE public.feature_flags TO service_role;


--
-- Name: SEQUENCE feature_flags_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.feature_flags_id_seq TO anon;
GRANT ALL ON SEQUENCE public.feature_flags_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.feature_flags_id_seq TO service_role;


--
-- Name: TABLE file_uploads; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.file_uploads TO anon;
GRANT ALL ON TABLE public.file_uploads TO authenticated;
GRANT ALL ON TABLE public.file_uploads TO service_role;


--
-- Name: SEQUENCE file_uploads_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.file_uploads_id_seq TO anon;
GRANT ALL ON SEQUENCE public.file_uploads_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.file_uploads_id_seq TO service_role;


--
-- Name: TABLE forms; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.forms TO anon;
GRANT ALL ON TABLE public.forms TO authenticated;
GRANT ALL ON TABLE public.forms TO service_role;


--
-- Name: SEQUENCE forms_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.forms_id_seq TO anon;
GRANT ALL ON SEQUENCE public.forms_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.forms_id_seq TO service_role;


--
-- Name: TABLE magic_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.magic_links TO anon;
GRANT ALL ON TABLE public.magic_links TO authenticated;
GRANT ALL ON TABLE public.magic_links TO service_role;


--
-- Name: SEQUENCE magic_links_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.magic_links_id_seq TO anon;
GRANT ALL ON SEQUENCE public.magic_links_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.magic_links_id_seq TO service_role;


--
-- Name: TABLE manager_permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.manager_permissions TO anon;
GRANT ALL ON TABLE public.manager_permissions TO authenticated;
GRANT ALL ON TABLE public.manager_permissions TO service_role;


--
-- Name: SEQUENCE manager_permissions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.manager_permissions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.manager_permissions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.manager_permissions_id_seq TO service_role;


--
-- Name: TABLE managers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.managers TO anon;
GRANT ALL ON TABLE public.managers TO authenticated;
GRANT ALL ON TABLE public.managers TO service_role;


--
-- Name: SEQUENCE managers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.managers_id_seq TO anon;
GRANT ALL ON SEQUENCE public.managers_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.managers_id_seq TO service_role;


--
-- Name: TABLE maritime_terminology; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.maritime_terminology TO anon;
GRANT ALL ON TABLE public.maritime_terminology TO authenticated;
GRANT ALL ON TABLE public.maritime_terminology TO service_role;


--
-- Name: SEQUENCE maritime_terminology_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.maritime_terminology_id_seq TO anon;
GRANT ALL ON SEQUENCE public.maritime_terminology_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.maritime_terminology_id_seq TO service_role;


--
-- Name: TABLE mfa_failure_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mfa_failure_log TO anon;
GRANT ALL ON TABLE public.mfa_failure_log TO authenticated;
GRANT ALL ON TABLE public.mfa_failure_log TO service_role;


--
-- Name: SEQUENCE mfa_failure_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.mfa_failure_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mfa_failure_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mfa_failure_log_id_seq TO service_role;


--
-- Name: TABLE password_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.password_history TO anon;
GRANT ALL ON TABLE public.password_history TO authenticated;
GRANT ALL ON TABLE public.password_history TO service_role;


--
-- Name: TABLE quiz_content; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.quiz_content TO anon;
GRANT ALL ON TABLE public.quiz_content TO authenticated;
GRANT ALL ON TABLE public.quiz_content TO service_role;


--
-- Name: SEQUENCE quiz_content_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.quiz_content_id_seq TO anon;
GRANT ALL ON SEQUENCE public.quiz_content_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.quiz_content_id_seq TO service_role;


--
-- Name: TABLE quiz_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.quiz_history TO anon;
GRANT ALL ON TABLE public.quiz_history TO authenticated;
GRANT ALL ON TABLE public.quiz_history TO service_role;


--
-- Name: SEQUENCE quiz_history_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.quiz_history_id_seq TO anon;
GRANT ALL ON SEQUENCE public.quiz_history_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.quiz_history_id_seq TO service_role;


--
-- Name: TABLE quiz_results; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.quiz_results TO anon;
GRANT ALL ON TABLE public.quiz_results TO authenticated;
GRANT ALL ON TABLE public.quiz_results TO service_role;


--
-- Name: SEQUENCE quiz_results_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.quiz_results_id_seq TO anon;
GRANT ALL ON SEQUENCE public.quiz_results_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.quiz_results_id_seq TO service_role;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.refresh_tokens TO anon;
GRANT ALL ON TABLE public.refresh_tokens TO authenticated;
GRANT ALL ON TABLE public.refresh_tokens TO service_role;


--
-- Name: TABLE security_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.security_events TO anon;
GRANT ALL ON TABLE public.security_events TO authenticated;
GRANT ALL ON TABLE public.security_events TO service_role;


--
-- Name: TABLE system_notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_notifications TO anon;
GRANT ALL ON TABLE public.system_notifications TO authenticated;
GRANT ALL ON TABLE public.system_notifications TO service_role;


--
-- Name: SEQUENCE system_notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.system_notifications_id_seq TO anon;
GRANT ALL ON SEQUENCE public.system_notifications_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.system_notifications_id_seq TO service_role;


--
-- Name: TABLE system_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_settings TO anon;
GRANT ALL ON TABLE public.system_settings TO authenticated;
GRANT ALL ON TABLE public.system_settings TO service_role;


--
-- Name: TABLE token_blacklist; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.token_blacklist TO anon;
GRANT ALL ON TABLE public.token_blacklist TO authenticated;
GRANT ALL ON TABLE public.token_blacklist TO service_role;


--
-- Name: SEQUENCE token_blacklist_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.token_blacklist_id_seq TO anon;
GRANT ALL ON SEQUENCE public.token_blacklist_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.token_blacklist_id_seq TO service_role;


--
-- Name: TABLE training_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.training_items TO anon;
GRANT ALL ON TABLE public.training_items TO authenticated;
GRANT ALL ON TABLE public.training_items TO service_role;


--
-- Name: SEQUENCE training_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.training_items_id_seq TO anon;
GRANT ALL ON SEQUENCE public.training_items_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.training_items_id_seq TO service_role;


--
-- Name: TABLE training_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.training_sessions TO anon;
GRANT ALL ON TABLE public.training_sessions TO authenticated;
GRANT ALL ON TABLE public.training_sessions TO service_role;


--
-- Name: SEQUENCE training_sessions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.training_sessions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.training_sessions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.training_sessions_id_seq TO service_role;


--
-- Name: TABLE translation_memory; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.translation_memory TO anon;
GRANT ALL ON TABLE public.translation_memory TO authenticated;
GRANT ALL ON TABLE public.translation_memory TO service_role;


--
-- Name: SEQUENCE translation_memory_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.translation_memory_id_seq TO anon;
GRANT ALL ON SEQUENCE public.translation_memory_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.translation_memory_id_seq TO service_role;


--
-- Name: TABLE user_mfa_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_mfa_settings TO anon;
GRANT ALL ON TABLE public.user_mfa_settings TO authenticated;
GRANT ALL ON TABLE public.user_mfa_settings TO service_role;


--
-- Name: TABLE user_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_sessions TO anon;
GRANT ALL ON TABLE public.user_sessions TO authenticated;
GRANT ALL ON TABLE public.user_sessions TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO anon;
GRANT ALL ON SEQUENCE public.users_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.users_id_seq TO service_role;


--
-- Name: TABLE workflow_instances; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.workflow_instances TO anon;
GRANT ALL ON TABLE public.workflow_instances TO authenticated;
GRANT ALL ON TABLE public.workflow_instances TO service_role;


--
-- Name: SEQUENCE workflow_instances_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.workflow_instances_id_seq TO anon;
GRANT ALL ON SEQUENCE public.workflow_instances_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.workflow_instances_id_seq TO service_role;


--
-- Name: TABLE workflow_phases; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.workflow_phases TO anon;
GRANT ALL ON TABLE public.workflow_phases TO authenticated;
GRANT ALL ON TABLE public.workflow_phases TO service_role;


--
-- Name: SEQUENCE workflow_phases_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.workflow_phases_id_seq TO anon;
GRANT ALL ON SEQUENCE public.workflow_phases_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.workflow_phases_id_seq TO service_role;


--
-- Name: TABLE workflow_progress; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.workflow_progress TO anon;
GRANT ALL ON TABLE public.workflow_progress TO authenticated;
GRANT ALL ON TABLE public.workflow_progress TO service_role;


--
-- Name: SEQUENCE workflow_progress_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.workflow_progress_id_seq TO anon;
GRANT ALL ON SEQUENCE public.workflow_progress_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.workflow_progress_id_seq TO service_role;


--
-- Name: TABLE workflows; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.workflows TO anon;
GRANT ALL ON TABLE public.workflows TO authenticated;
GRANT ALL ON TABLE public.workflows TO service_role;


--
-- Name: SEQUENCE workflows_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.workflows_id_seq TO anon;
GRANT ALL ON SEQUENCE public.workflows_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.workflows_id_seq TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict XUUfNO6AuuWzIlsli5BcRyVTEyohTFiqUvkKfu7Q0clowBEtznh9WXSg3KFifLc

