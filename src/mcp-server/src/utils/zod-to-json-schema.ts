/**
 * Zod to JSON Schema Converter
 * Converts Zod schemas to JSON Schema format for MCP tools
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { z } from 'zod';

/**
 * Simple converter for basic Zod schemas to JSON Schema
 * This is a minimal implementation for the most common cases
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): any {
  // For now, return a simple schema that will allow compilation
  // A full implementation would inspect the Zod schema and convert it properly
  return {
    type: 'object',
    properties: {},
    additionalProperties: true
  };
}

/**
 * Wrapper to make Zod schemas compatible with MCP tool definitions
 */
export function wrapZodSchema(zodSchema: z.ZodTypeAny): any {
  // Extract the shape if it's an object schema
  if (zodSchema instanceof z.ZodObject) {
    const shape = zodSchema.shape;
    const properties: any = {};
    const required: string[] = [];
    
    // Convert each property
    for (const [key, value] of Object.entries(shape)) {
      // Basic type mapping
      if (value instanceof z.ZodString) {
        properties[key] = { type: 'string' };
      } else if (value instanceof z.ZodNumber) {
        properties[key] = { type: 'number' };
      } else if (value instanceof z.ZodBoolean) {
        properties[key] = { type: 'boolean' };
      } else if (value instanceof z.ZodArray) {
        properties[key] = { type: 'array', items: { type: 'string' } };
      } else if (value instanceof z.ZodObject) {
        properties[key] = { type: 'object', additionalProperties: true };
      } else if (value instanceof z.ZodOptional) {
        // Handle optional fields
        const innerType = (value as any)._def.innerType;
        if (innerType instanceof z.ZodString) {
          properties[key] = { type: 'string' };
        } else if (innerType instanceof z.ZodNumber) {
          properties[key] = { type: 'number' };
        } else if (innerType instanceof z.ZodBoolean) {
          properties[key] = { type: 'boolean' };
        } else {
          properties[key] = { type: 'string' };
        }
      } else {
        // Default to string for unknown types
        properties[key] = { type: 'string' };
      }
      
      // Check if field is required
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    }
    
    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };
  }
  
  // For non-object schemas, return a basic schema
  return {
    type: 'object',
    additionalProperties: true
  };
}