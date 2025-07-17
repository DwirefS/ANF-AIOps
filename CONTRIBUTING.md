# Contributing to ANF AI-Ops

Thank you for your interest in contributing to the Azure NetApp Files AI-Ops solution! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## How to Contribute

### Reporting Issues

- Check existing issues before creating a new one
- Use issue templates for bug reports and feature requests
- Provide detailed information including:
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment details
  - Error messages and logs

### Pull Request Process

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/anf-aiops.git
   cd anf-aiops
   git remote add upstream https://github.com/original-org/anf-aiops.git
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow coding standards
   - Write tests for new functionality
   - Update documentation
   - Ensure all tests pass

4. **Commit Changes**
   ```bash
   git commit -m "feat: add new feature"
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org/)

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Development Setup

1. **Prerequisites**
   - .NET 8.0 SDK
   - Node.js 18+
   - Python 3.9+
   - Azure CLI
   - Docker Desktop

2. **Install Dependencies**
   ```bash
   # MCP Server dependencies
   cd src/mcp-server
   dotnet restore
   
   # Agent dependencies
   cd ../copilot-agents
   npm install
   ```

3. **Run Tests**
   ```bash
   # Run all tests
   ./scripts/test/run-all-tests.sh
   
   # Run specific test suite
   dotnet test tests/unit/ANF.AIops.Tests.csproj
   ```

### Coding Standards

#### C# (.NET)
- Follow [C# Coding Conventions](https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)
- Use async/await for async operations
- Implement proper error handling
- Add XML documentation comments

#### TypeScript/JavaScript
- Use TypeScript for type safety
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use ESLint and Prettier
- Write JSDoc comments

#### Python
- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/)
- Use type hints
- Write docstrings for all functions

### Testing Requirements

- Unit test coverage must be >80%
- All new features require integration tests
- Security-sensitive code requires security tests
- Performance-critical code requires benchmark tests

### Documentation

- Update README.md for user-facing changes
- Add/update API documentation
- Include inline code comments
- Update deployment guides if needed

## Review Process

1. **Automated Checks**
   - CI/CD pipeline runs tests
   - Code quality checks
   - Security scanning
   - License compliance

2. **Code Review**
   - At least 2 approvals required
   - Address all feedback
   - Resolve all conversations

3. **Merge Requirements**
   - All checks must pass
   - Branch must be up to date
   - No merge conflicts

## Release Process

- We use semantic versioning (MAJOR.MINOR.PATCH)
- Releases are created from the main branch
- Release notes are automatically generated
- Hotfixes follow expedited process

## Getting Help

- 💬 [Discussions](https://github.com/your-org/anf-aiops/discussions)
- 📧 dev-team@your-org.com
- 📚 [Developer Docs](docs/development/getting-started.md)

Thank you for contributing! 🎉