variable "location" {
  type    = string
  default = "eastus"
}

variable "resource_group_name" {
  type = string
}

variable "environment_name" {
  type    = string
  default = "anf-mcp-env"
}

variable "subscription_id" {
  type = string
}

variable "container_image" {
  type        = string
  description = "Container image with MCP server"
}

variable "container_registry" {
  type        = string
  description = "Container registry server, e.g. myacr.azurecr.io"
}

variable "mcp_api_key" {
  type        = string
  description = "Shared secret for MCP API calls"
  sensitive   = true
}
