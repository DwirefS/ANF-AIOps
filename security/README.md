# Security Configuration for ANF-AIOps

**Author:** Dwiref Sharma <DwirefS@SapientEdge.io>

This directory contains comprehensive security scanning configurations and tools for the ANF-AIOps project.

## Overview

The security configuration includes:

- **Static Application Security Testing (SAST)** with Semgrep
- **Infrastructure as Code (IaC) Security** with Checkov
- **Code Quality Analysis** with SonarQube
- **Secret Detection** with GitLeaks and detect-secrets
- **License Compliance** checking
- **Dependency Vulnerability** scanning

## Files and Configurations

### Core Security Files

- **`SECURITY.md`** - Security policy and incident response procedures
- **`sonar-project.properties`** - SonarQube configuration for code quality and security analysis
- **`semgrep.yml`** - Custom SAST rules for security vulnerability detection
- **`checkov.yml`** - Infrastructure as Code security scanning configuration
- **`license-checker.config.js`** - License compliance checking configuration

### Security Tools Integration

#### 1. Semgrep (SAST)

Semgrep provides static analysis security testing with custom rules for:

- Azure-specific security vulnerabilities
- JWT security issues
- SQL injection detection
- XSS prevention
- Cryptographic vulnerabilities
- Path traversal detection

**Usage:**
```bash
# Run Semgrep scan
semgrep --config=security/semgrep.yml src/

# Run with specific rules
semgrep --config=auto --config=security src/
```

#### 2. Checkov (IaC Security)

Checkov scans Infrastructure as Code for security misconfigurations:

- Azure security best practices
- Terraform security checks
- Bicep template validation
- Docker security scanning
- Kubernetes security policies

**Usage:**
```bash
# Scan infrastructure code
checkov --config-file security/checkov.yml

# Scan specific directory
checkov -d src/infrastructure --config-file security/checkov.yml
```

#### 3. SonarQube (Code Quality & Security)

SonarQube provides comprehensive code quality and security analysis:

- Security hotspots detection
- Code smell identification
- Technical debt analysis
- Test coverage reporting
- Maintainability ratings

**Usage:**
```bash
# Run SonarQube analysis
sonar-scanner -Dproject.settings=security/sonar-project.properties
```

#### 4. License Compliance

License checking ensures all dependencies comply with enterprise policies:

- Allowed/forbidden license validation
- SPDX document generation
- Attribution file creation
- Compliance reporting

**Usage:**
```bash
# Check license compliance
license-checker --config security/license-checker.config.js
```

## Pre-commit Integration

All security tools are integrated with pre-commit hooks:

```yaml
# Install pre-commit hooks
pre-commit install

# Run all hooks manually
pre-commit run --all-files

# Run specific hook
pre-commit run semgrep
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Security Scan
  uses: returntocorp/semgrep-action@v1
  with:
    config: security/semgrep.yml

- name: Infrastructure Security
  uses: bridgecrewio/checkov-action@master
  with:
    config_file: security/checkov.yml
```

### Azure DevOps

```yaml
- task: Semgrep@1
  inputs:
    configFile: 'security/semgrep.yml'
    
- task: Checkov@1
  inputs:
    configFile: 'security/checkov.yml'
```

## Security Scanning Schedule

### Automated Scans

- **Pre-commit:** Basic security checks on every commit
- **Pre-push:** Comprehensive scans before pushing to remote
- **Daily:** Dependency vulnerability scans
- **Weekly:** Full security audit
- **Monthly:** License compliance review

### Manual Reviews

- **Quarterly:** Penetration testing
- **Bi-annually:** Security policy review
- **Annually:** Third-party security assessment

## Security Metrics and KPIs

### Security Quality Gates

1. **Critical Vulnerabilities:** 0 tolerance
2. **High Vulnerabilities:** Max 5 findings
3. **License Violations:** 0 tolerance
4. **Code Coverage:** Minimum 80%
5. **Security Hotspots:** All resolved or accepted

### Compliance Frameworks

- **ISO 27001** - Information Security Management
- **SOC 2 Type II** - Service Organization Control
- **NIST Cybersecurity Framework** - Security controls
- **CIS Controls** - Center for Internet Security
- **OWASP Top 10** - Web application security risks

## Incident Response

### Security Incident Classification

- **P0 - Critical:** Data breach, active exploitation
- **P1 - High:** Confirmed vulnerability with high impact
- **P2 - Medium:** Potential vulnerability with medium impact
- **P3 - Low:** Security improvement opportunities

### Response Procedures

1. **Detection:** Automated alerts and monitoring
2. **Analysis:** Security team investigation
3. **Containment:** Immediate threat mitigation
4. **Eradication:** Remove threat from environment
5. **Recovery:** Restore normal operations
6. **Lessons Learned:** Process improvement

## Security Tools Installation

### Prerequisites

```bash
# Install required tools
npm install -g @semgrep/cli
pip install checkov
pip install detect-secrets
brew install gitleaks # or appropriate package manager
```

### Tool Versions

- **Semgrep:** v1.52.0+
- **Checkov:** v3.1.34+
- **GitLeaks:** v8.18.1+
- **detect-secrets:** v1.4.0+
- **SonarQube:** v9.0+

## Configuration Customization

### Custom Rules

Add custom security rules in:
- `security/custom-semgrep-rules/`
- `security/custom-checkov-checks/`
- `security/sonar-custom-rules/`

### Environment-Specific Settings

- **Development:** Relaxed rules for faster development
- **Staging:** Full security scanning
- **Production:** Strictest security requirements

## Troubleshooting

### Common Issues

1. **False Positives:** Add suppressions to configuration files
2. **Performance:** Adjust scan scope and parallelization
3. **Integration:** Check webhook URLs and API keys

### Support

For security-related issues:

- **Security Team:** DwirefS@SapientEdge.io
- **Documentation:** Internal security wiki
- **Escalation:** Follow incident response procedures

## Security Best Practices

### Development Guidelines

1. **Secure by Design:** Security considerations from project start
2. **Defense in Depth:** Multiple security layers
3. **Least Privilege:** Minimal necessary permissions
4. **Input Validation:** Sanitize all user inputs
5. **Output Encoding:** Prevent injection attacks

### Code Review Checklist

- [ ] No hardcoded secrets or credentials
- [ ] Proper input validation and sanitization
- [ ] Secure authentication and authorization
- [ ] Error handling doesn't expose sensitive information
- [ ] Cryptographic operations use approved algorithms
- [ ] Dependencies are up-to-date and vulnerability-free

## Compliance Reporting

### Automated Reports

- **Daily:** Vulnerability status dashboard
- **Weekly:** Security metrics summary
- **Monthly:** Compliance status report
- **Quarterly:** Executive security briefing

### Manual Reports

- **Risk Assessments:** Quarterly
- **Penetration Test Reports:** Annually
- **Audit Reports:** As required by compliance frameworks

---

**Last Updated:** 2025-07-18  
**Next Review:** 2025-10-18  
**Contact:** Dwiref Sharma <DwirefS@SapientEdge.io>