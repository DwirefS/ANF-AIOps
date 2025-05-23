terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">=3.100.0"
    }
  }

  required_version = ">= 1.4.0"
}

provider "azurerm" {
  features {}
}

module "container_app_env" {
  source  = "Azure/container-app-environment/azurerm"
  version = ">= 0.2.0"
  name                = var.environment_name
  resource_group_name = var.resource_group_name
  location            = var.location
}

module "mcp_container_app" {
  source  = "Azure/container-app/azurerm"
  version = ">= 0.4.0"

  name                    = "anf-mcp"
  container_app_env_id    = module.container_app_env.id
  revision_mode           = "Single"
  image                   = var.container_image
  ingress_external_enabled = true
  target_port             = 8000
  registry_server         = var.container_registry
  env_vars = {
    AZURE_SUBSCRIPTION_ID = var.subscription_id
    AZURE_RESOURCE_GROUP  = var.resource_group_name
    MCP_API_KEY           = var.mcp_api_key
  }
}

resource "azurerm_role_assignment" "mcp_netapp" {
  principal_id         = module.mcp_container_app.system_assigned_identity.0.principal_id
  role_definition_name = "Contributor"  # least-privilege: create custom role if desired
  scope                = data.azurerm_subscription.current.id
}

data "azurerm_subscription" "current" {}
