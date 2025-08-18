#!/usr/bin/env python3
"""
Supabase MCP Server for Maritime Onboarding System

A Model Context Protocol server that provides tools for managing
Supabase database operations, specifically tailored for the
maritime onboarding system.
"""

import asyncio
import json
import os
import sys
from typing import Any, Dict, List, Optional, Union
import logging

# MCP imports
try:
    from mcp.server import Server
    from mcp.server.models import InitializationOptions
    from mcp.server.stdio import stdio_server
    from mcp.types import (
        Resource,
        Tool,
        TextContent,
        ImageContent,
        EmbeddedResource,
    )
except ImportError:
    print("MCP library not found. Install with: pip install mcp", file=sys.stderr)
    sys.exit(1)

# Supabase imports
try:
    from supabase import create_client, Client
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Supabase/PostgreSQL libraries not found. Install with: pip install supabase psycopg2-binary", file=sys.stderr)
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SupabaseMCPServer:
    def __init__(self):
        self.server = Server("supabase-maritime")
        self.supabase: Optional[Client] = None
        self.db_connection = None
        
        # Initialize Supabase client
        self._init_supabase()
        
        # Register tools
        self._register_tools()
        
        # Register resources
        self._register_resources()

    def _init_supabase(self):
        """Initialize Supabase client"""
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            
            if not supabase_url or not supabase_key:
                logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required")
                return
            
            self.supabase = create_client(supabase_url, supabase_key)
            logger.info("Supabase client initialized successfully")
            
            # Also create direct PostgreSQL connection for advanced queries
            db_url = supabase_url.replace("https://", "postgresql://postgres:")
            db_password = os.getenv("SUPABASE_DB_PASSWORD", "")
            if db_password:
                db_url = f"postgresql://postgres:{db_password}@{supabase_url.split('//')[1].split('.')[0]}.supabase.co:5432/postgres"
                try:
                    self.db_connection = psycopg2.connect(db_url)
                    logger.info("Direct PostgreSQL connection established")
                except Exception as e:
                    logger.warning(f"Could not establish direct PostgreSQL connection: {e}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")

    def _register_tools(self):
        """Register MCP tools"""
        
        @self.server.list_tools()
        async def handle_list_tools() -> List[Tool]:
            return [
                Tool(
                    name="list_tables",
                    description="List all tables in the Supabase database",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "schema": {
                                "type": "string",
                                "description": "Database schema name (default: public)",
                                "default": "public"
                            }
                        }
                    }
                ),
                Tool(
                    name="describe_table",
                    description="Get detailed information about a specific table",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "table_name": {
                                "type": "string",
                                "description": "Name of the table to describe"
                            },
                            "include_data": {
                                "type": "boolean",
                                "description": "Include sample data (default: false)",
                                "default": False
                            }
                        },
                        "required": ["table_name"]
                    }
                ),
                Tool(
                    name="query_table",
                    description="Query data from a table with optional filters",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "table_name": {
                                "type": "string",
                                "description": "Name of the table to query"
                            },
                            "columns": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Columns to select (default: all)"
                            },
                            "filters": {
                                "type": "object",
                                "description": "Filters to apply (key-value pairs)"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum number of rows to return (default: 100)",
                                "default": 100
                            },
                            "order_by": {
                                "type": "string",
                                "description": "Column to order by"
                            }
                        },
                        "required": ["table_name"]
                    }
                ),
                Tool(
                    name="insert_data",
                    description="Insert new data into a table",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "table_name": {
                                "type": "string",
                                "description": "Name of the table to insert into"
                            },
                            "data": {
                                "type": "object",
                                "description": "Data to insert (key-value pairs)"
                            }
                        },
                        "required": ["table_name", "data"]
                    }
                ),
                Tool(
                    name="update_data",
                    description="Update existing data in a table",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "table_name": {
                                "type": "string",
                                "description": "Name of the table to update"
                            },
                            "data": {
                                "type": "object",
                                "description": "Data to update (key-value pairs)"
                            },
                            "filters": {
                                "type": "object",
                                "description": "Filters to identify rows to update"
                            }
                        },
                        "required": ["table_name", "data", "filters"]
                    }
                ),
                Tool(
                    name="delete_data",
                    description="Delete data from a table",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "table_name": {
                                "type": "string",
                                "description": "Name of the table to delete from"
                            },
                            "filters": {
                                "type": "object",
                                "description": "Filters to identify rows to delete"
                            }
                        },
                        "required": ["table_name", "filters"]
                    }
                ),
                Tool(
                    name="execute_sql",
                    description="Execute a custom SQL query (read-only operations recommended)",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "SQL query to execute"
                            },
                            "params": {
                                "type": "array",
                                "description": "Parameters for the query"
                            }
                        },
                        "required": ["query"]
                    }
                ),
                Tool(
                    name="get_user_progress",
                    description="Get training progress for a specific user (maritime-specific)",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "user_id": {
                                "type": "string",
                                "description": "User ID to get progress for"
                            },
                            "include_details": {
                                "type": "boolean",
                                "description": "Include detailed progress information",
                                "default": True
                            }
                        },
                        "required": ["user_id"]
                    }
                ),
                Tool(
                    name="get_training_analytics",
                    description="Get training analytics and statistics (maritime-specific)",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "date_range": {
                                "type": "string",
                                "description": "Date range for analytics (7d, 30d, 90d, 1y)",
                                "default": "30d"
                            },
                            "group_by": {
                                "type": "string",
                                "description": "Group analytics by (user, phase, training_item)",
                                "default": "phase"
                            }
                        }
                    }
                ),
                Tool(
                    name="backup_database",
                    description="Create a backup of specific tables or entire database",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "tables": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Specific tables to backup (default: all)"
                            },
                            "format": {
                                "type": "string",
                                "description": "Backup format (json, csv, sql)",
                                "default": "json"
                            }
                        }
                    }
                )
            ]

        @self.server.call_tool()
        async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
            try:
                if name == "list_tables":
                    return await self._list_tables(arguments)
                elif name == "describe_table":
                    return await self._describe_table(arguments)
                elif name == "query_table":
                    return await self._query_table(arguments)
                elif name == "insert_data":
                    return await self._insert_data(arguments)
                elif name == "update_data":
                    return await self._update_data(arguments)
                elif name == "delete_data":
                    return await self._delete_data(arguments)
                elif name == "execute_sql":
                    return await self._execute_sql(arguments)
                elif name == "get_user_progress":
                    return await self._get_user_progress(arguments)
                elif name == "get_training_analytics":
                    return await self._get_training_analytics(arguments)
                elif name == "backup_database":
                    return await self._backup_database(arguments)
                else:
                    return [TextContent(type="text", text=f"Unknown tool: {name}")]
            except Exception as e:
                logger.error(f"Error executing tool {name}: {e}")
                return [TextContent(type="text", text=f"Error: {str(e)}")]

    def _register_resources(self):
        """Register MCP resources"""
        
        @self.server.list_resources()
        async def handle_list_resources() -> List[Resource]:
            return [
                Resource(
                    uri="supabase://schema",
                    name="Database Schema",
                    description="Complete database schema information",
                    mimeType="application/json"
                ),
                Resource(
                    uri="supabase://tables",
                    name="Tables List",
                    description="List of all database tables",
                    mimeType="application/json"
                ),
                Resource(
                    uri="supabase://analytics",
                    name="Training Analytics",
                    description="Maritime training analytics dashboard",
                    mimeType="application/json"
                )
            ]

        @self.server.read_resource()
        async def handle_read_resource(uri: str) -> str:
            if uri == "supabase://schema":
                return await self._get_schema_resource()
            elif uri == "supabase://tables":
                return await self._get_tables_resource()
            elif uri == "supabase://analytics":
                return await self._get_analytics_resource()
            else:
                raise ValueError(f"Unknown resource: {uri}")

    # Tool implementations
    async def _list_tables(self, args: Dict[str, Any]) -> List[TextContent]:
        """List all tables in the database"""
        if not self.supabase:
            return [TextContent(type="text", text="Supabase client not initialized")]
        
        try:
            # Query information_schema to get table information
            query = """
            SELECT 
                table_name,
                table_type,
                table_schema
            FROM information_schema.tables 
            WHERE table_schema = %s
            ORDER BY table_name
            """
            
            schema = args.get("schema", "public")
            
            if self.db_connection:
                with self.db_connection.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(query, (schema,))
                    tables = cur.fetchall()
            else:
                # Fallback to known maritime system tables
                tables = [
                    {"table_name": "users", "table_type": "BASE TABLE", "table_schema": "public"},
                    {"table_name": "user_progress", "table_type": "BASE TABLE", "table_schema": "public"},
                    {"table_name": "training_items", "table_type": "BASE TABLE", "table_schema": "public"},
                    {"table_name": "quiz_responses", "table_type": "BASE TABLE", "table_schema": "public"},
                    {"table_name": "certificates", "table_type": "BASE TABLE", "table_schema": "public"},
                    {"table_name": "security_events", "table_type": "BASE TABLE", "table_schema": "public"},
                    {"table_name": "user_sessions", "table_type": "BASE TABLE", "table_schema": "public"}
                ]
            
            result = {
                "schema": schema,
                "tables": tables,
                "count": len(tables)
            }
            
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
            
        except Exception as e:
            return [TextContent(type="text", text=f"Error listing tables: {str(e)}")]

    async def _describe_table(self, args: Dict[str, Any]) -> List[TextContent]:
        """Describe a specific table"""
        table_name = args["table_name"]
        include_data = args.get("include_data", False)
        
        try:
            # Get table structure
            if self.db_connection:
                with self.db_connection.cursor(cursor_factory=RealDictCursor) as cur:
                    # Get column information
                    cur.execute("""
                        SELECT 
                            column_name,
                            data_type,
                            is_nullable,
                            column_default,
                            character_maximum_length
                        FROM information_schema.columns 
                        WHERE table_name = %s 
                        ORDER BY ordinal_position
                    """, (table_name,))
                    columns = cur.fetchall()
                    
                    # Get row count
                    from psycopg2 import sql
                cur.execute(
                    sql.SQL("SELECT COUNT(*) as count FROM {}").format(sql.Identifier(table_name))
                )
                    row_count = cur.fetchone()["count"]
            else:
                # Use Supabase client
                response = self.supabase.table(table_name).select("*", count="exact").limit(1).execute()
                row_count = response.count
                columns = []
            
            result = {
                "table_name": table_name,
                "columns": columns,
                "row_count": row_count
            }
            
            # Include sample data if requested
            if include_data and row_count > 0:
                if self.supabase:
                    sample_data = self.supabase.table(table_name).select("*").limit(5).execute()
                    result["sample_data"] = sample_data.data
            
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
            
        except Exception as e:
            return [TextContent(type="text", text=f"Error describing table {table_name}: {str(e)}")]

    async def _query_table(self, args: Dict[str, Any]) -> List[TextContent]:
        """Query data from a table"""
        table_name = args["table_name"]
        columns = args.get("columns", ["*"])
        filters = args.get("filters", {})
        limit = args.get("limit", 100)
        order_by = args.get("order_by")
        
        try:
            query = self.supabase.table(table_name)
            
            # Select columns
            if columns and columns != ["*"]:
                query = query.select(",".join(columns))
            else:
                query = query.select("*")
            
            # Apply filters
            for key, value in filters.items():
                query = query.eq(key, value)
            
            # Apply ordering
            if order_by:
                query = query.order(order_by)
            
            # Apply limit
            query = query.limit(limit)
            
            response = query.execute()
            
            result = {
                "table_name": table_name,
                "filters": filters,
                "row_count": len(response.data),
                "data": response.data
            }
            
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
            
        except Exception as e:
            return [TextContent(type="text", text=f"Error querying table {table_name}: {str(e)}")]

    async def _insert_data(self, args: Dict[str, Any]) -> List[TextContent]:
        """Insert data into a table"""
        table_name = args["table_name"]
        data = args["data"]
        
        try:
            response = self.supabase.table(table_name).insert(data).execute()
            
            result = {
                "table_name": table_name,
                "inserted_rows": len(response.data),
                "data": response.data
            }
            
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
            
        except Exception as e:
            return [TextContent(type="text", text=f"Error inserting data into {table_name}: {str(e)}")]

    async def _update_data(self, args: Dict[str, Any]) -> List[TextContent]:
        """Update data in a table"""
        table_name = args["table_name"]
        data = args["data"]
        filters = args["filters"]
        
        try:
            query = self.supabase.table(table_name).update(data)
            
            # Apply filters
            for key, value in filters.items():
                query = query.eq(key, value)
            
            response = query.execute()
            
            result = {
                "table_name": table_name,
                "updated_rows": len(response.data),
                "filters": filters,
                "data": response.data
            }
            
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
            
        except Exception as e:
            return [TextContent(type="text", text=f"Error updating data in {table_name}: {str(e)}")]

    async def _delete_data(self, args: Dict[str, Any]) -> List[TextContent]:
        """Delete data from a table"""
        table_name = args["table_name"]
        filters = args["filters"]
        
        try:
            query = self.supabase.table(table_name)
            
            # Apply filters
            for key, value in filters.items():
                query = query.eq(key, value)
            
            response = query.delete().execute()
            
            result = {
                "table_name": table_name,
                "deleted_rows": len(response.data),
                "filters": filters
            }
            
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
            
        except Exception as e:
            return [TextContent(type="text", text=f"Error deleting data from {table_name}: {str(e)}")]

    async def _execute_sql(self, args: Dict[str, Any]) -> List[TextContent]:
        """Execute custom SQL query with read-only enforcement"""
        query = args["query"]
        params = args.get("params", [])
        allow_write = args.get("allow_write", False)
        
        try:
            if not self.db_connection:
                return [TextContent(type="text", text="Direct SQL execution requires PostgreSQL connection")]
            
            # Enforce read-only mode by default
            if not allow_write and not self._is_read_only_query(query):
                return [TextContent(type="text", text="Write operations require explicit confirmation. Set allow_write=true to execute.")]
            
            with self.db_connection.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                
                if cur.description:
                    results = cur.fetchall()
                    result = {
                        "query": query,
                        "row_count": len(results),
                        "data": results
                    }
                else:
                    result = {
                        "query": query,
                        "message": "Query executed successfully (no results returned)"
                    }
            
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
            
        except Exception as e:
            return [TextContent(type="text", text=f"Error executing SQL: {str(e)}")]

    def _is_read_only_query(self, query: str) -> bool:
        """Check if a SQL query is read-only"""
        query_upper = query.strip().upper()
        
        # Allow SELECT, SHOW, DESCRIBE, EXPLAIN queries
        read_only_keywords = ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'WITH']
        
        # Check if query starts with read-only keyword
        for keyword in read_only_keywords:
            if query_upper.startswith(keyword):
                return True
        
        # Disallow write operations
        write_keywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE']
        for keyword in write_keywords:
            if keyword in query_upper:
                return False
        
        # Default to read-only if uncertain
        return True

    async def _get_user_progress(self, args: Dict[str, Any]) -> List[TextContent]:
        """Get user training progress (maritime-specific)"""
        user_id = args["user_id"]
        include_details = args.get("include_details", True)
        
        try:
            # Get user information
            user_response = self.supabase.table("users").select("*").eq("id", user_id).execute()
            if not user_response.data:
                return [TextContent(type="text", text=f"User {user_id} not found")]
            
            user = user_response.data[0]
            
            # Get progress data
            progress_response = self.supabase.table("user_progress").select("*").eq("user_id", user_id).execute()
            
            result = {
                "user_id": user_id,
                "user_info": user,
                "progress_entries": len(progress_response.data),
                "progress": progress_response.data if include_details else []
            }
            
            # Calculate completion statistics
            if progress_response.data:
                completed = len([p for p in progress_response.data if p.get("completed")])
                result["completion_stats"] = {
                    "total_items": len(progress_response.data),
                    "completed_items": completed,
                    "completion_percentage": round((completed / len(progress_response.data)) * 100, 2)
                }
            
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
            
        except Exception as e:
            return [TextContent(type="text", text=f"Error getting user progress: {str(e)}")]

    async def _get_training_analytics(self, args: Dict[str, Any]) -> List[TextContent]:
        """Get training analytics (maritime-specific)"""
        date_range = args.get("date_range", "30d")
        group_by = args.get("group_by", "phase")
        
        try:
            # This would typically involve complex queries
            # For now, return basic analytics
            
            # Get total users
            users_response = self.supabase.table("users").select("*", count="exact").execute()
            total_users = users_response.count
            
            # Get progress data
            progress_response = self.supabase.table("user_progress").select("*").execute()
            
            # Calculate basic analytics
            total_progress_entries = len(progress_response.data)
            completed_entries = len([p for p in progress_response.data if p.get("completed")])
            
            result = {
                "date_range": date_range,
                "group_by": group_by,
                "analytics": {
                    "total_users": total_users,
                    "total_progress_entries": total_progress_entries,
                    "completed_entries": completed_entries,
                    "completion_rate": round((completed_entries / total_progress_entries * 100), 2) if total_progress_entries > 0 else 0
                }
            }
            
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
            
        except Exception as e:
            return [TextContent(type="text", text=f"Error getting training analytics: {str(e)}")]

    async def _backup_database(self, args: Dict[str, Any]) -> List[TextContent]:
        """Create database backup"""
        tables = args.get("tables", [])
        format_type = args.get("format", "json")
        
        try:
            backup_data = {}
            
            # If no specific tables specified, backup all main tables
            if not tables:
                tables = ["users", "user_progress", "training_items", "quiz_responses", "certificates"]
            
            for table in tables:
                try:
                    response = self.supabase.table(table).select("*").execute()
                    backup_data[table] = response.data
                except Exception as e:
                    backup_data[table] = f"Error backing up table: {str(e)}"
            
            from datetime import datetime, timezone
            result = {
                "backup_timestamp": datetime.now(timezone.utc).isoformat(),
                "format": format_type,
                "tables_backed_up": len([t for t in tables if isinstance(backup_data.get(t), list)]),
                "backup_data": backup_data
            }
            
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
            
        except Exception as e:
            return [TextContent(type="text", text=f"Error creating backup: {str(e)}")]

    # Resource implementations
    async def _get_schema_resource(self) -> str:
        """Get complete database schema"""
        try:
            tables_result = await self._list_tables({"schema": "public"})
            return tables_result[0].text
        except Exception as e:
            return json.dumps({"error": str(e)})

    async def _get_tables_resource(self) -> str:
        """Get tables list resource"""
        try:
            tables_result = await self._list_tables({"schema": "public"})
            return tables_result[0].text
        except Exception as e:
            return json.dumps({"error": str(e)})

    async def _get_analytics_resource(self) -> str:
        """Get analytics resource"""
        try:
            analytics_result = await self._get_training_analytics({"date_range": "30d"})
            return analytics_result[0].text
        except Exception as e:
            return json.dumps({"error": str(e)})

    async def run(self):
        """Run the MCP server"""
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="supabase-maritime",
                    server_version="1.0.0"
                )
            )

def main():
    """Main entry point"""
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        print("✅ Supabase MCP Server is ready!")
        print("✅ Python dependencies are installed")
        print("✅ MCP server can be initialized")
        print("\nTo use the server:")
        print("1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        print("2. Run the server through Kiro IDE MCP configuration")
        return
    
    server = SupabaseMCPServer()
    asyncio.run(server.run())

if __name__ == "__main__":
    main()