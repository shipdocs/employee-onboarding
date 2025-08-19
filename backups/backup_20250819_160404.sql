--
-- PostgreSQL database dump
--

\restrict jMKaDPvL7tnj4jUqQem831GAE8u34mZXkHRUoBgPzZ2oIy7jbTd4gYw9xiWCyMo

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
    created_at timestamp with time zone DEFAULT now(),
    resource_type character varying(100),
    resource_id character varying(255),
    details jsonb,
    company_id integer
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
    created_at timestamp with time zone DEFAULT now(),
    email character varying(255),
    used_ip character varying(45)
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
-- Name: pdf_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pdf_templates (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    page_size character varying(20) DEFAULT 'A4'::character varying,
    orientation character varying(20) DEFAULT 'portrait'::character varying,
    background_image text,
    fields jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by bigint,
    updated_by bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


ALTER TABLE public.pdf_templates OWNER TO postgres;

--
-- Name: pdf_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pdf_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pdf_templates_id_seq OWNER TO postgres;

--
-- Name: pdf_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdf_templates_id_seq OWNED BY public.pdf_templates.id;


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
    updated_at timestamp with time zone DEFAULT now(),
    vessel_assignment character varying(255)
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
-- Name: pdf_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_templates ALTER COLUMN id SET DEFAULT nextval('public.pdf_templates_id_seq'::regclass);


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

COPY public.audit_log (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at, resource_type, resource_id, details, company_id) FROM stdin;
df2e9a41-73a8-491d-97fe-f0264ef7032e	\N	rate_limit_violation	\N	\N	\N	\N	::ffff:172.20.0.1	python-requests/2.25.1	2025-08-19 11:18:55.296086+00	security	\N	{"method": "POST", "endpoint": "/api/auth/request-magic-link", "ip_address": "::ffff:172.20.0.1", "user_agent": "python-requests/2.25.1", "window_start": "2025-08-19T11:18:54.261Z", "request_count": 5, "rate_limit_key": "auth:::ffff:172.20.0.1"}	\N
b8d19728-291c-43c8-a4d9-3d3d5cf91767	\N	rate_limit_violation	\N	\N	\N	\N	::ffff:172.20.0.1	python-requests/2.25.1	2025-08-19 11:20:18.793214+00	security	\N	{"method": "POST", "endpoint": "/api/auth/request-magic-link", "ip_address": "::ffff:172.20.0.1", "user_agent": "python-requests/2.25.1", "window_start": "2025-08-19T11:20:17.735Z", "request_count": 5, "rate_limit_key": "auth:::ffff:172.20.0.1"}	\N
18e16111-ca2a-4836-9bfc-0c769c2299d3	\N	rate_limit_violation	\N	\N	\N	\N	::ffff:172.20.0.1	curl/7.81.0	2025-08-19 11:20:31.592763+00	security	\N	{"method": "POST", "endpoint": "/api/auth/request-magic-link", "ip_address": "::ffff:172.20.0.1", "user_agent": "curl/7.81.0", "window_start": "2025-08-19T11:20:17.735Z", "request_count": 5, "rate_limit_key": "auth:::ffff:172.20.0.1"}	\N
9ea771b2-03cf-4148-876d-4d0be221c56b	\N	rate_limit_violation	\N	\N	\N	\N	::ffff:172.20.0.1	curl/7.81.0	2025-08-19 11:20:38.722139+00	security	\N	{"method": "POST", "endpoint": "/api/auth/request-magic-link", "ip_address": "::ffff:172.20.0.1", "user_agent": "curl/7.81.0", "window_start": "2025-08-19T11:20:17.735Z", "request_count": 5, "rate_limit_key": "auth:::ffff:172.20.0.1"}	\N
ac5d8dcc-d87b-42af-bb92-6660acb513fb	\N	rate_limit_violation	\N	\N	\N	\N	::ffff:172.20.0.1	python-requests/2.25.1	2025-08-19 11:27:33.576209+00	security	\N	{"method": "POST", "endpoint": "/api/auth/request-magic-link", "ip_address": "::ffff:172.20.0.1", "user_agent": "python-requests/2.25.1", "window_start": "2025-08-19T11:27:33.548Z", "request_count": 5, "rate_limit_key": "auth:::ffff:172.20.0.1"}	\N
ad650d98-a67a-4e26-a6af-e6e47b34953f	\N	rate_limit_violation	\N	\N	\N	\N	::ffff:172.20.0.1	python-requests/2.25.1	2025-08-19 11:27:33.598355+00	security	\N	{"method": "POST", "endpoint": "/api/auth/request-magic-link", "ip_address": "::ffff:172.20.0.1", "user_agent": "python-requests/2.25.1", "window_start": "2025-08-19T11:27:33.548Z", "request_count": 5, "rate_limit_key": "auth:::ffff:172.20.0.1"}	\N
02c44f4d-1184-4d0c-b3fd-8805fa3e479c	\N	rate_limit_violation	\N	\N	\N	\N	::ffff:172.20.0.1	python-requests/2.25.1	2025-08-19 11:27:33.608549+00	security	\N	{"method": "POST", "endpoint": "/api/auth/request-magic-link", "ip_address": "::ffff:172.20.0.1", "user_agent": "python-requests/2.25.1", "window_start": "2025-08-19T11:27:33.548Z", "request_count": 5, "rate_limit_key": "auth:::ffff:172.20.0.1"}	\N
c1798b2c-e9e8-4ef4-9c42-136bb489082d	\N	rate_limit_violation	\N	\N	\N	\N	::ffff:172.20.0.1	python-requests/2.25.1	2025-08-19 11:27:33.619278+00	security	\N	{"method": "POST", "endpoint": "/api/auth/request-magic-link", "ip_address": "::ffff:172.20.0.1", "user_agent": "python-requests/2.25.1", "window_start": "2025-08-19T11:27:33.548Z", "request_count": 5, "rate_limit_key": "auth:::ffff:172.20.0.1"}	\N
98ae57f7-c9f8-46d3-83b5-0f11d21a2354	\N	rate_limit_violation	\N	\N	\N	\N	::ffff:172.20.0.1	python-requests/2.25.1	2025-08-19 11:27:33.631185+00	security	\N	{"method": "POST", "endpoint": "/api/auth/request-magic-link", "ip_address": "::ffff:172.20.0.1", "user_agent": "python-requests/2.25.1", "window_start": "2025-08-19T11:27:33.548Z", "request_count": 5, "rate_limit_key": "auth:::ffff:172.20.0.1"}	\N
4731a866-a8e0-433f-b086-7cd7e52137f7	\N	rate_limit_violation	\N	\N	\N	\N	::ffff:172.20.0.1	python-requests/2.25.1	2025-08-19 11:27:33.653573+00	security	\N	{"method": "POST", "endpoint": "/api/auth/request-magic-link", "ip_address": "::ffff:172.20.0.1", "user_agent": "python-requests/2.25.1", "window_start": "2025-08-19T11:27:33.548Z", "request_count": 5, "rate_limit_key": "auth:::ffff:172.20.0.1"}	\N
04081303-fe54-43a5-a6e4-7727d80ac135	\N	rate_limit_violation	\N	\N	\N	\N	::ffff:172.20.0.1	python-requests/2.25.1	2025-08-19 11:27:33.670533+00	security	\N	{"method": "POST", "endpoint": "/api/auth/request-magic-link", "ip_address": "::ffff:172.20.0.1", "user_agent": "python-requests/2.25.1", "window_start": "2025-08-19T11:27:33.548Z", "request_count": 5, "rate_limit_key": "auth:::ffff:172.20.0.1"}	\N
c988b89c-d2a5-46ca-9b76-b3ae1fc6efde	\N	rate_limit_violation	\N	\N	\N	\N	::ffff:172.20.0.1	python-requests/2.25.1	2025-08-19 11:27:33.703881+00	security	\N	{"method": "POST", "endpoint": "/api/auth/request-magic-link", "ip_address": "::ffff:172.20.0.1", "user_agent": "python-requests/2.25.1", "window_start": "2025-08-19T11:27:33.548Z", "request_count": 5, "rate_limit_key": "auth:::ffff:172.20.0.1"}	\N
4898859e-50cf-4913-a9c0-d9c7a1639a97	\N	rate_limit_violation	\N	\N	\N	\N	::ffff:172.20.0.1	curl/7.81.0	2025-08-19 11:28:00.24858+00	security	\N	{"method": "POST", "endpoint": "/api/auth/request-magic-link", "ip_address": "::ffff:172.20.0.1", "user_agent": "curl/7.81.0", "window_start": "2025-08-19T11:27:33.548Z", "request_count": 5, "rate_limit_key": "auth:::ffff:172.20.0.1"}	\N
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

COPY public.magic_links (id, user_id, token, expires_at, used, used_at, ip_address, user_agent, created_at, email, used_ip) FROM stdin;
1	\N	31efa79b8a57ea2123ceea151b4bc6cd516e37e68238aea7ca4599d68c6d4ed5	2025-08-19 14:37:23.698+00	f	\N	\N	\N	2025-08-19 11:37:23.698825+00	crew1@maritime-onboarding.local	\N
2	5	6b5a4f8a381a698e61bd6b9f7eb4e60978cb884f3d5009328af60601d25b73b0	2025-08-19 14:39:11.181+00	f	2025-08-19 11:42:22.972346+00	\N	\N	2025-08-19 11:39:11.181893+00	crew2@maritime-onboarding.local	::ffff:172.20.0.1
\.


--
-- Data for Name: manager_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.manager_permissions (id, manager_id, permission_type, resource_type, resource_id, granted_by, created_at) FROM stdin;
1	1	manage_crew	department	\N	1	2025-08-19 11:06:58.523456+00
2	1	view_reports	system	\N	1	2025-08-19 11:06:58.523456+00
3	2	manage_training	department	\N	1	2025-08-19 11:06:58.523456+00
4	2	view_reports	system	\N	1	2025-08-19 11:06:58.523456+00
\.


--
-- Data for Name: managers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.managers (id, user_id, department, permissions, created_at, updated_at) FROM stdin;
1	2	Fleet Operations	{"manage_crew": true, "view_reports": true}	2025-08-19 11:06:58.516697+00	2025-08-19 11:06:58.516697+00
2	3	Training Department	{"view_reports": true, "manage_training": true}	2025-08-19 11:06:58.516697+00	2025-08-19 11:06:58.516697+00
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
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdf_templates (id, name, description, page_size, orientation, background_image, fields, metadata, created_by, updated_by, created_at, updated_at, is_active) FROM stdin;
1	Safety Certificate Template	Standard template for safety training certificates	A4	landscape	\N	[{"x": 100, "y": 150, "id": "participant_name", "type": "text", "label": "Participant Name", "width": 300, "height": 30, "fontSize": 18, "fontWeight": "bold"}, {"x": 100, "y": 200, "id": "course_name", "type": "text", "label": "Course Name", "width": 400, "height": 25, "fontSize": 14}, {"x": 100, "y": 250, "id": "completion_date", "type": "date", "label": "Completion Date", "width": 200, "height": 25, "fontSize": 12}, {"x": 100, "y": 300, "id": "instructor_signature", "type": "signature", "label": "Instructor Signature", "width": 200, "height": 50}, {"x": 500, "y": 350, "id": "certificate_number", "type": "text", "label": "Certificate Number", "width": 150, "height": 20, "fontSize": 10}]	{"type": "certificate", "version": "1.0", "category": "safety", "requires_signature": true}	1	1	2025-08-19 11:05:50.143473+00	2025-08-19 11:05:50.143473+00	t
2	Training Record Form	Template for recording training session details	A4	portrait	\N	[{"x": 50, "y": 100, "id": "trainee_name", "type": "text", "label": "Trainee Name", "width": 250, "height": 25, "fontSize": 12}, {"x": 350, "y": 100, "id": "trainer_name", "type": "text", "label": "Trainer Name", "width": 200, "height": 25, "fontSize": 12}, {"x": 50, "y": 150, "id": "training_topic", "type": "text", "label": "Training Topic", "width": 500, "height": 25, "fontSize": 12}, {"x": 50, "y": 200, "id": "duration_hours", "type": "number", "label": "Duration (Hours)", "width": 100, "height": 25, "fontSize": 12}, {"x": 200, "y": 200, "id": "assessment_score", "type": "number", "label": "Assessment Score (%)", "width": 100, "height": 25, "fontSize": 12}, {"x": 50, "y": 250, "id": "notes", "type": "textarea", "label": "Additional Notes", "width": 500, "height": 100, "fontSize": 10}]	{"type": "form", "version": "1.1", "category": "training", "auto_calculate": true}	2	2	2025-08-19 11:05:50.143473+00	2025-08-19 11:05:50.143473+00	t
3	Incident Report Template	Template for documenting safety incidents	A4	portrait	\N	[{"x": 50, "y": 100, "id": "incident_date", "type": "date", "label": "Incident Date", "width": 150, "height": 25, "fontSize": 12}, {"x": 250, "y": 100, "id": "incident_time", "type": "time", "label": "Incident Time", "width": 100, "height": 25, "fontSize": 12}, {"x": 400, "y": 100, "id": "location", "type": "text", "label": "Location", "width": 150, "height": 25, "fontSize": 12}, {"x": 50, "y": 150, "id": "reporter_name", "type": "text", "label": "Reporter Name", "width": 200, "height": 25, "fontSize": 12}, {"x": 300, "y": 150, "id": "incident_type", "type": "select", "label": "Incident Type", "width": 200, "height": 25, "options": ["Near Miss", "Minor Injury", "Major Injury", "Equipment Damage", "Environmental"], "fontSize": 12}, {"x": 50, "y": 200, "id": "description", "type": "textarea", "label": "Incident Description", "width": 500, "height": 150, "fontSize": 10}, {"x": 50, "y": 370, "id": "immediate_actions", "type": "textarea", "label": "Immediate Actions Taken", "width": 500, "height": 100, "fontSize": 10}, {"x": 50, "y": 500, "id": "supervisor_signature", "type": "signature", "label": "Supervisor Signature", "width": 200, "height": 50}]	{"type": "report", "version": "2.0", "category": "safety", "priority": "high", "requires_approval": true}	1	1	2025-08-19 11:05:50.143473+00	2025-08-19 11:05:50.143473+00	t
4	Safety Certificate Template	Standard template for safety training certificates	A4	landscape	\N	[{"x": 100, "y": 150, "id": "participant_name", "type": "text", "label": "Participant Name", "width": 300, "height": 30, "fontSize": 18, "fontWeight": "bold"}, {"x": 100, "y": 200, "id": "course_name", "type": "text", "label": "Course Name", "width": 400, "height": 25, "fontSize": 14}, {"x": 100, "y": 250, "id": "completion_date", "type": "date", "label": "Completion Date", "width": 200, "height": 25, "fontSize": 12}, {"x": 100, "y": 300, "id": "instructor_signature", "type": "signature", "label": "Instructor Signature", "width": 200, "height": 50}, {"x": 500, "y": 350, "id": "certificate_number", "type": "text", "label": "Certificate Number", "width": 150, "height": 20, "fontSize": 10}]	{"type": "certificate", "version": "1.0", "category": "safety", "requires_signature": true}	1	1	2025-08-19 11:06:58.531817+00	2025-08-19 11:06:58.531817+00	t
5	Training Record Form	Template for recording training session details	A4	portrait	\N	[{"x": 50, "y": 100, "id": "trainee_name", "type": "text", "label": "Trainee Name", "width": 250, "height": 25, "fontSize": 12}, {"x": 350, "y": 100, "id": "trainer_name", "type": "text", "label": "Trainer Name", "width": 200, "height": 25, "fontSize": 12}, {"x": 50, "y": 150, "id": "training_topic", "type": "text", "label": "Training Topic", "width": 500, "height": 25, "fontSize": 12}, {"x": 50, "y": 200, "id": "duration_hours", "type": "number", "label": "Duration (Hours)", "width": 100, "height": 25, "fontSize": 12}, {"x": 200, "y": 200, "id": "assessment_score", "type": "number", "label": "Assessment Score (%)", "width": 100, "height": 25, "fontSize": 12}, {"x": 50, "y": 250, "id": "notes", "type": "textarea", "label": "Additional Notes", "width": 500, "height": 100, "fontSize": 10}]	{"type": "form", "version": "1.1", "category": "training", "auto_calculate": true}	2	2	2025-08-19 11:06:58.531817+00	2025-08-19 11:06:58.531817+00	t
6	Incident Report Template	Template for documenting safety incidents	A4	portrait	\N	[{"x": 50, "y": 100, "id": "incident_date", "type": "date", "label": "Incident Date", "width": 150, "height": 25, "fontSize": 12}, {"x": 250, "y": 100, "id": "incident_time", "type": "time", "label": "Incident Time", "width": 100, "height": 25, "fontSize": 12}, {"x": 400, "y": 100, "id": "location", "type": "text", "label": "Location", "width": 150, "height": 25, "fontSize": 12}, {"x": 50, "y": 150, "id": "reporter_name", "type": "text", "label": "Reporter Name", "width": 200, "height": 25, "fontSize": 12}, {"x": 300, "y": 150, "id": "incident_type", "type": "select", "label": "Incident Type", "width": 200, "height": 25, "options": ["Near Miss", "Minor Injury", "Major Injury", "Equipment Damage", "Environmental"], "fontSize": 12}, {"x": 50, "y": 200, "id": "description", "type": "textarea", "label": "Incident Description", "width": 500, "height": 150, "fontSize": 10}, {"x": 50, "y": 370, "id": "immediate_actions", "type": "textarea", "label": "Immediate Actions Taken", "width": 500, "height": 100, "fontSize": 10}, {"x": 50, "y": 500, "id": "supervisor_signature", "type": "signature", "label": "Supervisor Signature", "width": 200, "height": 50}]	{"type": "report", "version": "2.0", "category": "safety", "priority": "high", "requires_approval": true}	1	1	2025-08-19 11:06:58.531817+00	2025-08-19 11:06:58.531817+00	t
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
2fafe604-a84e-496b-af23-6c5f0e134b10	security_threat_1755591247546_tbs96aa0x	security_threat_detected	high	\N	::ffff:172.20.0.1	curl/7.81.0	{"url": "/api/auth/admin-login", "method": "POST", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T08:14:07.546Z", "request_data": {"url": "/api/auth/admin-login", "body": "{\\"email\\":\\"admin@maritime-onboarding.local\\",\\"password\\":\\"password\\"}", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"content-type\\":\\"application/json\\",\\"content-length\\":\\"65\\",\\"x-request-id\\":\\"req_5762af9fd0c8\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 08:14:07.564089+00	2025-08-19 08:14:07.564089+00
21d5f67f-f708-4f7b-9cd1-e103de208819	security_threat_1755591848645_baihf72kl	security_threat_detected	high	\N	172.20.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"url": "/api/auth/login-with-mfa", "method": "POST", "origin": "http://localhost", "threats": ["sql_injection_attempt", "cors_violation"], "timestamp": "2025-08-19T08:24:08.645Z", "request_data": {"url": "/api/auth/login-with-mfa", "body": "{\\"email\\":\\"admin@maritime-onboarding.local\\",\\"password\\":\\"password\\",\\"mfaToken\\":null}", "query": "{}", "headers": "{\\"host\\":\\"localhost\\",\\"x-real-ip\\":\\"172.20.0.1\\",\\"x-forwarded-for\\":\\"172.20.0.1\\",\\"x-forwarded-proto\\":\\"http\\",\\"connection\\":\\"close\\",\\"content-length\\":\\"81\\",\\"pragma\\":\\"no-cache\\",\\"cache-control\\":\\"no-cache\\",\\"sec-ch-ua-platform\\":\\"\\\\\\"Linux\\\\\\"\\",\\"user-agent\\":\\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36\\",\\"accept\\":\\"application/json, text/plain, */*\\",\\"sec-ch-ua\\":\\"\\\\\\"Not;A=Brand\\\\\\";v=\\\\\\"99\\\\\\", \\\\\\"Brave\\\\\\";v=\\\\\\"139\\\\\\", \\\\\\"Chromium\\\\\\";v=\\\\\\"139\\\\\\"\\",\\"content-type\\":\\"application/json\\",\\"sec-ch-ua-mobile\\":\\"?0\\",\\"sec-gpc\\":\\"1\\",\\"origin\\":\\"http://localhost\\",\\"sec-fetch-site\\":\\"same-origin\\",\\"sec-fetch-mode\\":\\"cors\\",\\"sec-fetch-dest\\":\\"empty\\",\\"referer\\":\\"http://localhost/login\\",\\"accept-encoding\\":\\"gzip, deflate, br, zstd\\",\\"accept-language\\":\\"en-US,en;q=0.9,nl;q=0.8\\",\\"x-request-id\\":\\"req_5c4b0736c424\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"], "cors_violation": {"type": "cors_violation", "origin": "http://localhost", "allowedOrigins": ["https://onboarding.burando.online", "http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"]}}}	{sql_injection_attempt,cors_violation}	2025-08-19 08:24:08.657016+00	2025-08-19 08:24:08.657016+00
06e345ce-6e6c-4108-ba9a-3d8b4d84a1db	security_threat_1755599238635_k59fkc0sz	security_threat_detected	high	\N	172.20.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:27:18.635Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost\\",\\"x-real-ip\\":\\"172.20.0.1\\",\\"x-forwarded-for\\":\\"172.20.0.1\\",\\"x-forwarded-proto\\":\\"http\\",\\"connection\\":\\"close\\",\\"sec-ch-ua-platform\\":\\"\\\\\\"Linux\\\\\\"\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NTk5MjM4LCJleHAiOjE3NTU2ODU2Mzh9.07ux3X75Jy8fKN4Q4CAUQVJKhFLGSLe4GDuNI0H3paQ\\",\\"user-agent\\":\\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36\\",\\"accept\\":\\"application/json, text/plain, */*\\",\\"sec-ch-ua\\":\\"\\\\\\"Not;A=Brand\\\\\\";v=\\\\\\"99\\\\\\", \\\\\\"Brave\\\\\\";v=\\\\\\"139\\\\\\", \\\\\\"Chromium\\\\\\";v=\\\\\\"139\\\\\\"\\",\\"sec-ch-ua-mobile\\":\\"?0\\",\\"sec-gpc\\":\\"1\\",\\"sec-fetch-site\\":\\"same-origin\\",\\"sec-fetch-mode\\":\\"cors\\",\\"sec-fetch-dest\\":\\"empty\\",\\"referer\\":\\"http://localhost/admin\\",\\"accept-encoding\\":\\"gzip, deflate, br, zstd\\",\\"accept-language\\":\\"en-US,en;q=0.9,nl;q=0.8\\",\\"x-request-id\\":\\"req_25e9c4cab853\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:27:18.651471+00	2025-08-19 10:27:18.651471+00
ffbb065d-e467-49e3-9469-4fa6d0000507	security_threat_1755599521799_qxei1yaqb	security_threat_detected	high	\N	::ffff:172.20.0.1	curl/7.81.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:32:01.799Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"authorization\\":\\"Bearer null\\",\\"x-request-id\\":\\"req_63fa4dc38d96\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:32:01.823466+00	2025-08-19 10:32:01.823466+00
17c86896-3cd2-4df3-971b-fe59742ee3d0	security_threat_1755599593265_nehnvm7lo	security_threat_detected	high	\N	::ffff:172.20.0.1	curl/7.81.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:33:13.265Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NTk5NTgyLCJleHAiOjE3NTU2ODU5ODJ9.x9I3pHIRPnR2VWg1FB_ow_ho2rROn9ttBWL10i0lzmk\\",\\"x-request-id\\":\\"req_f40ce94e5c17\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:33:13.271376+00	2025-08-19 10:33:13.271376+00
99be13a8-0483-449e-8599-4db96d0da810	security_threat_1755599741298_d73h9efju	security_threat_detected	high	\N	::ffff:172.20.0.1	curl/7.81.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:35:41.298Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NTk5NzMxLCJleHAiOjE3NTU2ODYxMzF9.-ankKbcto0gp8u-zWb8eRGVYh2fNASPuRDw23YFu_d0\\",\\"x-request-id\\":\\"req_a6808b51b741\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:35:41.308799+00	2025-08-19 10:35:41.308799+00
41967cc9-d50f-4d71-b22c-6c5808142494	security_threat_1755599848961_r73em9cnl	security_threat_detected	high	\N	::ffff:172.20.0.1	curl/7.81.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:37:28.961Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NTk5ODQwLCJleHAiOjE3NTU2ODYyNDB9.PKKLsm6v20u1JwrDphAGoU39B6tqjCXd8V_yiu70PLU\\",\\"x-request-id\\":\\"req_ec45cd6c6af7\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:37:28.968709+00	2025-08-19 10:37:28.968709+00
f3f975ce-8a1c-4f5e-a1eb-6750178a7daa	security_threat_1755599923808_9euckkr8m	security_threat_detected	high	\N	::ffff:172.20.0.1	curl/7.81.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:38:43.808Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NTk5OTE1LCJleHAiOjE3NTU2ODYzMTV9.Lvh4YNluWC3CvMHgObj_HzspVI3prDC29x1ABcD97ws\\",\\"x-request-id\\":\\"req_4e70f6d10f5c\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:38:43.818591+00	2025-08-19 10:38:43.818591+00
749b0597-bc90-4d78-a973-92ed331067eb	security_threat_1755600027851_vlcg0a3s4	security_threat_detected	high	\N	::ffff:172.20.0.1	curl/7.81.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:40:27.851Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NTk5OTE1LCJleHAiOjE3NTU2ODYzMTV9.Lvh4YNluWC3CvMHgObj_HzspVI3prDC29x1ABcD97ws\\",\\"x-request-id\\":\\"req_86b65fae43f1\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:40:27.869136+00	2025-08-19 10:40:27.869136+00
841aff57-9916-4873-bf8c-52c24533f164	security_threat_1755600088019_doh8y0l1w	security_threat_detected	high	\N	::ffff:172.20.0.1	curl/7.81.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:41:28.019Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NTk5OTE1LCJleHAiOjE3NTU2ODYzMTV9.Lvh4YNluWC3CvMHgObj_HzspVI3prDC29x1ABcD97ws\\",\\"x-request-id\\":\\"req_20dda5ff8f42\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:41:28.040927+00	2025-08-19 10:41:28.040927+00
9f7fc37f-65a9-4f5d-aa15-c7051934e09e	security_threat_1755600173419_3kuyohhx3	security_threat_detected	high	\N	::ffff:172.20.0.1	curl/7.81.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:42:53.419Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NTk5OTE1LCJleHAiOjE3NTU2ODYzMTV9.Lvh4YNluWC3CvMHgObj_HzspVI3prDC29x1ABcD97ws\\",\\"x-request-id\\":\\"req_1f9c56a6ac36\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:42:53.436486+00	2025-08-19 10:42:53.436486+00
16894c43-0fb2-4cbb-adb1-9616c6202df1	security_threat_1755600269176_861j09i8a	security_threat_detected	high	\N	::ffff:172.20.0.1	curl/7.81.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:44:29.176Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NTk5OTE1LCJleHAiOjE3NTU2ODYzMTV9.Lvh4YNluWC3CvMHgObj_HzspVI3prDC29x1ABcD97ws\\",\\"x-request-id\\":\\"req_35d15be5ae79\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:44:29.190302+00	2025-08-19 10:44:29.190302+00
8b52ea08-7a9f-4bb7-a5f6-7a1bea2b30b5	security_threat_1755600371829_lqs7u0vmk	security_threat_detected	high	\N	::ffff:172.20.0.1	curl/7.81.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:46:11.829Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NjAwMzU4LCJleHAiOjE3NTU2ODY3NTh9.EGB9mg9S68zPG8wZFg39VbIB6npJ3Qiroa2CKaxGe-o\\",\\"x-request-id\\":\\"req_8308429af18e\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:46:11.841307+00	2025-08-19 10:46:11.841307+00
e05d21df-6ebb-4703-98ed-c6940d4c25b8	security_threat_1755601765423_ryfpnf1bg	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:09:25.423Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NjAxNzY1LCJleHAiOjE3NTU2ODgxNjV9.sZNPSKTo6BJVI64Wz7PE9qMFCvbHYQOchEZ7R0u73NI\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_2bfad2078813\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:09:25.424685+00	2025-08-19 11:09:25.424685+00
fef72deb-3ba7-4af8-a6c3-c0462290659b	security_threat_1755600898155_5q7rjo87d	security_threat_detected	high	\N	172.20.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:54:58.155Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost\\",\\"x-real-ip\\":\\"172.20.0.1\\",\\"x-forwarded-for\\":\\"172.20.0.1\\",\\"x-forwarded-proto\\":\\"http\\",\\"connection\\":\\"close\\",\\"pragma\\":\\"no-cache\\",\\"cache-control\\":\\"no-cache\\",\\"sec-ch-ua-platform\\":\\"\\\\\\"Linux\\\\\\"\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NTk5MjM4LCJleHAiOjE3NTU2ODU2Mzh9.07ux3X75Jy8fKN4Q4CAUQVJKhFLGSLe4GDuNI0H3paQ\\",\\"user-agent\\":\\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36\\",\\"accept\\":\\"application/json, text/plain, */*\\",\\"sec-ch-ua\\":\\"\\\\\\"Not;A=Brand\\\\\\";v=\\\\\\"99\\\\\\", \\\\\\"Brave\\\\\\";v=\\\\\\"139\\\\\\", \\\\\\"Chromium\\\\\\";v=\\\\\\"139\\\\\\"\\",\\"sec-ch-ua-mobile\\":\\"?0\\",\\"sec-gpc\\":\\"1\\",\\"sec-fetch-site\\":\\"same-origin\\",\\"sec-fetch-mode\\":\\"cors\\",\\"sec-fetch-dest\\":\\"empty\\",\\"referer\\":\\"http://localhost/admin\\",\\"accept-encoding\\":\\"gzip, deflate, br, zstd\\",\\"accept-language\\":\\"en-US,en;q=0.9,nl;q=0.8\\",\\"x-request-id\\":\\"req_175b16f155ac\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:54:58.156446+00	2025-08-19 10:54:58.156446+00
844d7989-fe0c-4509-a97f-d1982b5cd349	security_threat_1755600902779_uyao763nu	security_threat_detected	high	\N	172.20.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:55:02.779Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost\\",\\"x-real-ip\\":\\"172.20.0.1\\",\\"x-forwarded-for\\":\\"172.20.0.1\\",\\"x-forwarded-proto\\":\\"http\\",\\"connection\\":\\"close\\",\\"pragma\\":\\"no-cache\\",\\"cache-control\\":\\"no-cache\\",\\"sec-ch-ua-platform\\":\\"\\\\\\"Linux\\\\\\"\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NTk5MjM4LCJleHAiOjE3NTU2ODU2Mzh9.07ux3X75Jy8fKN4Q4CAUQVJKhFLGSLe4GDuNI0H3paQ\\",\\"user-agent\\":\\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36\\",\\"accept\\":\\"application/json, text/plain, */*\\",\\"sec-ch-ua\\":\\"\\\\\\"Not;A=Brand\\\\\\";v=\\\\\\"99\\\\\\", \\\\\\"Brave\\\\\\";v=\\\\\\"139\\\\\\", \\\\\\"Chromium\\\\\\";v=\\\\\\"139\\\\\\"\\",\\"sec-ch-ua-mobile\\":\\"?0\\",\\"sec-gpc\\":\\"1\\",\\"sec-fetch-site\\":\\"same-origin\\",\\"sec-fetch-mode\\":\\"cors\\",\\"sec-fetch-dest\\":\\"empty\\",\\"referer\\":\\"http://localhost/admin\\",\\"accept-encoding\\":\\"gzip, deflate, br, zstd\\",\\"accept-language\\":\\"en-US,en;q=0.9,nl;q=0.8\\",\\"x-request-id\\":\\"req_29476af772e9\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:55:02.779952+00	2025-08-19 10:55:02.779952+00
f07c5ff9-6eb0-489b-afca-a09d837ad1fc	security_threat_1755601016694_4fyoqcki3	security_threat_detected	high	\N	::ffff:172.20.0.1	curl/7.81.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T10:56:56.694Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NjAwMzU4LCJleHAiOjE3NTU2ODY3NTh9.EGB9mg9S68zPG8wZFg39VbIB6npJ3Qiroa2CKaxGe-o\\",\\"x-request-id\\":\\"req_19e1f3a52c35\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 10:56:56.708964+00	2025-08-19 10:56:56.708964+00
86a07874-279e-48ae-aa0c-de29badfac75	security_threat_1755601765367_7ocdf8pnn	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:09:25.367Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NjAxNzY1LCJleHAiOjE3NTU2ODgxNjV9.sZNPSKTo6BJVI64Wz7PE9qMFCvbHYQOchEZ7R0u73NI\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_f516fab02c91\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:09:25.377564+00	2025-08-19 11:09:25.377564+00
9e3d53ab-c0bd-442c-b7e6-e3fd0fddca18	security_threat_1755601765387_luagokszd	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:09:25.387Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_9568af195038\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:09:25.387543+00	2025-08-19 11:09:25.387543+00
2df42286-1d5c-4b2f-8202-08612a816e5f	security_threat_1755601765389_au82z7d83	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:09:25.389Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_dd5c7b41bf54\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:09:25.389886+00	2025-08-19 11:09:25.389886+00
9c5d193b-749b-4286-894a-320efb5381cc	auth_fail_1755601765408_m43j4ylhm	authorization_failure	medium	\N	::1	axios/1.11.0	{"method": "GET", "endpoint": "/api/templates", "timestamp": "2025-08-19T11:09:25.408Z", "actual_role": "unauthenticated", "required_role": "authenticated"}	{privilege_escalation_attempt}	2025-08-19 11:09:25.409182+00	2025-08-19 11:09:25.409182+00
7edbf732-42a0-4ad2-b83c-f0c372321691	auth_fail_1755601765415_sf5h6voe8	authorization_failure	medium	\N	::1	axios/1.11.0	{"method": "GET", "endpoint": "/api/templates", "timestamp": "2025-08-19T11:09:25.415Z", "actual_role": "unauthenticated", "required_role": "authenticated"}	{privilege_escalation_attempt}	2025-08-19 11:09:25.415535+00	2025-08-19 11:09:25.415535+00
b5315889-324a-4a29-8dfa-b3f3a70f1999	login_failure_1755601765412_041d8fa0b1bc61dccd	login_failure	medium	\N	::1	axios/1.11.0	{"reason": "no_valid_token", "source": "security_audit_logger", "success": false, "endpoint": "/api/templates", "timestamp": "2025-08-19T11:09:25.412Z", "environment": "production"}	{authentication_bypass}	2025-08-19 11:09:25.412+00	2025-08-19 11:09:27.947056+00
ecba966a-d84c-4e56-88ba-bd524c71e265	login_failure_1755601765418_da45cfeb3d1de7eaf4	login_failure	medium	\N	::1	axios/1.11.0	{"reason": "no_valid_token", "source": "security_audit_logger", "success": false, "endpoint": "/api/templates", "timestamp": "2025-08-19T11:09:25.418Z", "environment": "production"}	{authentication_bypass}	2025-08-19 11:09:25.418+00	2025-08-19 11:09:27.947218+00
cfaafbff-dcb5-465f-8de7-5745831e5fbe	security_threat_1755601857786_qjynp17ar	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:10:57.786Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NjAxODU3LCJleHAiOjE3NTU2ODgyNTd9.foqIUnWLwC7Ife3SeS-b_qHRsaMV2Wl7HD-J7SkclkU\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_0feb893b5e7f\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:10:57.794721+00	2025-08-19 11:10:57.794721+00
07760496-14bf-4c0b-b526-36c8241ec2bd	security_threat_1755601857801_n09b24e9a	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:10:57.801Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_8aa7ea585065\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:10:57.801849+00	2025-08-19 11:10:57.801849+00
39966d5c-2e70-4c1c-966a-ce71123ddc2d	security_threat_1755601857801_xgk1bo1ld	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:10:57.801Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_31a45c38c26e\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:10:57.81336+00	2025-08-19 11:10:57.81336+00
a258db4a-0486-4d86-b787-771cf471de7b	auth_fail_1755601857830_dpne7wghn	authorization_failure	medium	\N	::1	axios/1.11.0	{"method": "GET", "endpoint": "/api/templates", "timestamp": "2025-08-19T11:10:57.830Z", "actual_role": "unauthenticated", "required_role": "authenticated"}	{privilege_escalation_attempt}	2025-08-19 11:10:57.831133+00	2025-08-19 11:10:57.831133+00
08b3d51d-176b-4706-b8b5-74cf95561bb7	security_threat_1755601857837_gj6365hc3	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:10:57.837Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NjAxODU3LCJleHAiOjE3NTU2ODgyNTd9.foqIUnWLwC7Ife3SeS-b_qHRsaMV2Wl7HD-J7SkclkU\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_33be6d11191e\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:10:57.83725+00	2025-08-19 11:10:57.83725+00
4bcb3b01-d8e7-40a1-bb79-b988ba785336	login_failure_1755601857834_9ed14c2daf650d8d6c	login_failure	medium	\N	::1	axios/1.11.0	{"reason": "no_valid_token", "source": "security_audit_logger", "success": false, "endpoint": "/api/templates", "timestamp": "2025-08-19T11:10:57.834Z", "environment": "production"}	{authentication_bypass}	2025-08-19 11:10:57.834+00	2025-08-19 11:10:58.010083+00
37ca4cae-2536-4f7a-bb2f-d4ab993bb0e4	security_threat_1755602029380_9ktvws5hc	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:13:49.380Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NjAyMDI5LCJleHAiOjE3NTU2ODg0Mjl9.nIW9pwLNYkZf5EoNUNMLOCUoTGmhQCHmsX83OEzJy7A\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_b8b3f2400fbc\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:13:49.391232+00	2025-08-19 11:13:49.391232+00
e760eefd-ec3f-460b-bc73-7397d054b1a5	security_threat_1755602029399_nw3hchjax	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:13:49.399Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyIiwiZW1haWwiOiJtYW5hZ2VyMUBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6Im1hbmFnZXIiLCJpYXQiOjE3NTU2MDIwMjksImV4cCI6MTc1NTY4ODQyOX0.FORoEggs41tIAfo0nHwG3gtUQj-EMsq6w8IiJpP3FQ0\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_a5506425f9a0\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:13:49.400219+00	2025-08-19 11:13:49.400219+00
71629c4c-5b89-4b1e-9a5c-563e1e6090e7	security_threat_1755602029402_uvwc4vvr2	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:13:49.402Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_8d31abf1ec97\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:13:49.402575+00	2025-08-19 11:13:49.402575+00
0a69f120-1a9f-4952-8b56-de4302a0909d	security_threat_1755602029424_hfyfwvp3w	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:13:49.424Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NjAyMDI5LCJleHAiOjE3NTU2ODg0Mjl9.nIW9pwLNYkZf5EoNUNMLOCUoTGmhQCHmsX83OEzJy7A\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_0746d1901333\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:13:49.424496+00	2025-08-19 11:13:49.424496+00
b5f6d33d-383f-49d2-8a73-7ebf93221325	security_threat_1755602029438_wcejhropr	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:13:49.438Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"authorization\\":\\"Bearer invalid.jwt.token\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_fbe1d04d90d1\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:13:49.438632+00	2025-08-19 11:13:49.438632+00
4d3558f4-21f4-4466-b0b5-78c2a0be578c	security_threat_1755602029453_2dun276wd	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:13:49.453Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_1eb09c0043c7\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:13:49.453451+00	2025-08-19 11:13:49.453451+00
6ab5576e-7a85-4354-be4f-95fe040e3e7f	security_threat_1755602029440_wqjo05iwq	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:13:49.440Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"authorization\\":\\"Bearer Bearer malformed-token\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_18d1b6853150\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:13:49.453797+00	2025-08-19 11:13:49.453797+00
48c84e91-cc92-4fff-8264-54a8267abab7	security_threat_1755602029440_4prdkwiho	security_threat_detected	high	\N	::1	axios/1.11.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:13:49.440Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"accept\\":\\"application/json, text/plain, */*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NjAyMDI5LCJleHAiOjE3NTU2ODg0Mjl9.nIW9pwLNYkZf5EoNUNMLOCUoTGmhQCHmsX83OEzJy7A\\",\\"user-agent\\":\\"axios/1.11.0\\",\\"accept-encoding\\":\\"gzip, compress, deflate, br\\",\\"host\\":\\"localhost:3000\\",\\"connection\\":\\"keep-alive\\",\\"x-request-id\\":\\"req_c9d619239f9a\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:13:49.454414+00	2025-08-19 11:13:49.454414+00
8905f843-5485-4a75-a340-6b084391a4ce	security_threat_1755602799805_0ehz919n0	security_threat_detected	high	\N	::ffff:172.20.0.1	curl/7.81.0	{"url": "/api/admin/managers", "method": "GET", "threats": ["sql_injection_attempt"], "timestamp": "2025-08-19T11:26:39.805Z", "request_data": {"url": "/api/admin/managers", "body": "", "query": "{}", "headers": "{\\"host\\":\\"localhost:3000\\",\\"user-agent\\":\\"curl/7.81.0\\",\\"accept\\":\\"*/*\\",\\"authorization\\":\\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkBtYXJpdGltZS1vbmJvYXJkaW5nLmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1NjAyNzg1LCJleHAiOjE3NTU2ODkxODV9.MiIXi4UQ9kxPz47HHyvlD5FyCy6VGUcAVvR9jVzM5fM\\",\\"x-request-id\\":\\"req_41cbb72e2634\\"}"}, "attack_details": {"sql_patterns": ["/(--|\\\\#|\\\\/\\\\*)/"]}}	{sql_injection_attempt}	2025-08-19 11:26:39.818092+00	2025-08-19 11:26:39.818092+00
1ecf373d-dd8c-4cf7-9f31-8e62190874df	rate_limit_1755602880237_wjhj0lvq1	rate_limit_violation	medium	\N	::ffff:172.20.0.1	curl/7.81.0	{"limit": 5, "method": "POST", "headers": {"user-agent": "curl/7.81.0"}, "endpoint": "/api/auth/request-magic-link", "timestamp": "2025-08-19T11:28:00.237Z", "window_ms": 60000, "reset_time": "2025-08-19T11:28:33.548Z", "current_count": 5, "first_request": "2025-08-19T11:27:33.548Z", "rate_limit_key": "auth:::ffff:172.20.0.1", "potential_attack": false}	{rate_limit_violation}	2025-08-19 11:28:00.237692+00	2025-08-19 11:28:00.237692+00
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
bc15dbdd-7305-4429-95e2-d0382a6905cb	company_name	Maritime Onboarding Solutions	Company name displayed in the application	general	f	2025-08-19 11:06:58.527848+00	2025-08-19 11:06:58.527848+00
c44e1507-e8b9-4191-86d2-5da76116115c	default_language	en	Default language for new users	general	f	2025-08-19 11:06:58.527848+00	2025-08-19 11:06:58.527848+00
1ce645fa-f17c-4560-8036-b0c3d1427522	timezone	UTC	Default timezone for the application	general	f	2025-08-19 11:06:58.527848+00	2025-08-19 11:06:58.527848+00
269915c7-819b-4ccb-b518-926ee7dd775f	password_min_length	8	Minimum password length requirement	security	f	2025-08-19 11:06:58.527848+00	2025-08-19 11:06:58.527848+00
f1ced878-07d2-4fe4-bf99-2bb1ef22b29b	session_timeout	3600	Session timeout in seconds	security	f	2025-08-19 11:06:58.527848+00	2025-08-19 11:06:58.527848+00
46fa62fb-f50c-4b34-a043-19136eaa33df	max_login_attempts	5	Maximum failed login attempts before lockout	security	f	2025-08-19 11:06:58.527848+00	2025-08-19 11:06:58.527848+00
ee31a20c-b1f0-4e20-85da-aa1883d7fc1b	smtp_host	localhost	SMTP server hostname	email	f	2025-08-19 11:06:58.527848+00	2025-08-19 11:06:58.527848+00
0c4c8ce0-1b14-45cb-99f3-2e36057d083e	smtp_port	1025	SMTP server port	email	f	2025-08-19 11:06:58.527848+00	2025-08-19 11:06:58.527848+00
07d6fa94-94b8-4784-a094-98d94ae1994c	from_address	noreply@maritime-onboarding.local	Default from email address	email	f	2025-08-19 11:06:58.527848+00	2025-08-19 11:06:58.527848+00
b08df8bc-a61b-4314-a158-1449503049d5	default_quiz_pass_score	80	Default passing score for quizzes (percentage)	training	f	2025-08-19 11:06:58.527848+00	2025-08-19 11:06:58.527848+00
1eab6cef-c4e7-4917-978e-7eb4dceb9e4c	certificate_validity_days	365	Default certificate validity period in days	training	f	2025-08-19 11:06:58.527848+00	2025-08-19 11:06:58.527848+00
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

COPY public.users (id, email, first_name, last_name, role, "position", preferred_language, status, is_active, password_hash, last_login, created_at, updated_at, vessel_assignment) FROM stdin;
1	admin@maritime-onboarding.local	\N	\N	admin	\N	en	active	t	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	\N	2025-08-19 07:25:59.407744+00	2025-08-19 07:25:59.407744+00	\N
2	manager1@maritime-onboarding.local	John	Smith	manager	Fleet Manager	en	active	t	$2b$10$c27qFFcK.NG.UZ2fJvxLxOD7S6jwEAbOp/edJijrXULvrdK.QyOUu	\N	2025-08-19 11:05:50.135988+00	2025-08-19 11:10:18.616127+00	\N
3	manager2@maritime-onboarding.local	Sarah	Johnson	manager	Training Coordinator	en	active	t	$2b$10$c27qFFcK.NG.UZ2fJvxLxOD7S6jwEAbOp/edJijrXULvrdK.QyOUu	\N	2025-08-19 11:05:50.135988+00	2025-08-19 11:10:18.616127+00	\N
4	crew1@maritime-onboarding.local	Mike	Wilson	crew	Deck Officer	en	active	t	$2b$10$c27qFFcK.NG.UZ2fJvxLxOD7S6jwEAbOp/edJijrXULvrdK.QyOUu	\N	2025-08-19 11:05:50.135988+00	2025-08-19 11:10:18.616127+00	\N
5	crew2@maritime-onboarding.local	Lisa	Brown	crew	Engineer	en	active	t	$2b$10$c27qFFcK.NG.UZ2fJvxLxOD7S6jwEAbOp/edJijrXULvrdK.QyOUu	\N	2025-08-19 11:05:50.135988+00	2025-08-19 11:10:18.616127+00	\N
6	crew3@maritime-onboarding.local	David	Davis	crew	Cook	en	active	t	$2b$10$c27qFFcK.NG.UZ2fJvxLxOD7S6jwEAbOp/edJijrXULvrdK.QyOUu	\N	2025-08-19 11:05:50.135988+00	2025-08-19 11:10:18.616127+00	\N
7	inactive@maritime-onboarding.local	Inactive	User	crew	Former Employee	en	active	f	$2b$10$c27qFFcK.NG.UZ2fJvxLxOD7S6jwEAbOp/edJijrXULvrdK.QyOUu	\N	2025-08-19 11:05:50.135988+00	2025-08-19 11:10:18.616127+00	\N
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

SELECT pg_catalog.setval('public.magic_links_id_seq', 2, true);


--
-- Name: manager_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.manager_permissions_id_seq', 4, true);


--
-- Name: managers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.managers_id_seq', 2, true);


--
-- Name: maritime_terminology_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maritime_terminology_id_seq', 1, false);


--
-- Name: mfa_failure_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mfa_failure_log_id_seq', 1, false);


--
-- Name: pdf_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdf_templates_id_seq', 6, true);


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

SELECT pg_catalog.setval('public.users_id_seq', 13, true);


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
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


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
-- Name: idx_pdf_templates_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pdf_templates_created_by ON public.pdf_templates USING btree (created_by);


--
-- Name: idx_pdf_templates_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pdf_templates_is_active ON public.pdf_templates USING btree (is_active);


--
-- Name: idx_pdf_templates_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pdf_templates_name ON public.pdf_templates USING btree (name);


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
-- Name: pdf_templates update_pdf_templates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pdf_templates_updated_at BEFORE UPDATE ON public.pdf_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
-- Name: pdf_templates pdf_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_templates
    ADD CONSTRAINT pdf_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: pdf_templates pdf_templates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_templates
    ADD CONSTRAINT pdf_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


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
-- Name: TABLE pdf_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pdf_templates TO anon;
GRANT ALL ON TABLE public.pdf_templates TO authenticated;
GRANT ALL ON TABLE public.pdf_templates TO service_role;


--
-- Name: SEQUENCE pdf_templates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.pdf_templates_id_seq TO anon;
GRANT ALL ON SEQUENCE public.pdf_templates_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pdf_templates_id_seq TO service_role;


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

\unrestrict jMKaDPvL7tnj4jUqQem831GAE8u34mZXkHRUoBgPzZ2oIy7jbTd4gYw9xiWCyMo

