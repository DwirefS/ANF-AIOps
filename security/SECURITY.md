# Security Policy

**Author:** Dwiref Sharma <DwirefS@SapientEdge.io>

## Supported Versions

We actively support and provide security updates for the following versions of ANF-AIOps:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

### Security Contact

If you discover a security vulnerability in ANF-AIOps, please report it responsibly:

**Primary Contact:** Dwiref Sharma  
**Email:** DwirefS@SapientEdge.io  
**Response Time:** Within 24 hours for critical vulnerabilities

### Reporting Process

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Send an email to the security contact with:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Any suggested fixes (if available)

### What to Expect

- **Acknowledgment:** Within 24 hours of your report
- **Initial Assessment:** Within 72 hours
- **Regular Updates:** Every 7 days until resolution
- **Resolution Timeline:** 
  - Critical: 1-3 days
  - High: 7-14 days
  - Medium: 30 days
  - Low: 60 days

## Security Measures

### Authentication & Authorization

- **Azure Active Directory Integration:** All services use Azure AD for authentication
- **JWT Token Validation:** All API endpoints validate JWT tokens
- **Role-Based Access Control (RBAC):** Implemented across all components
- **Principle of Least Privilege:** Applied to all service accounts and user roles

### Data Protection

- **Encryption at Rest:** All data stored in Azure services is encrypted
- **Encryption in Transit:** TLS 1.3 for all communications
- **Key Management:** Azure Key Vault for all secrets and certificates
- **Data Classification:** Sensitive data is properly classified and protected

### Infrastructure Security

- **Network Isolation:** VNet integration with private endpoints
- **WAF Protection:** Azure Application Gateway with WAF rules
- **DDoS Protection:** Azure DDoS Protection Standard
- **Security Groups:** Restricted network access controls

### Code Security

- **Static Application Security Testing (SAST):** Integrated in CI/CD pipeline
- **Dynamic Application Security Testing (DAST):** Automated security scans
- **Dependency Scanning:** Automated vulnerability scanning for dependencies
- **Secret Scanning:** Automated detection of secrets in code

### Monitoring & Logging

- **Azure Sentinel:** Security Information and Event Management (SIEM)
- **Application Insights:** Comprehensive application monitoring
- **Security Alerts:** Automated alerting for security events
- **Audit Logging:** Complete audit trail for all operations

## Security Testing

### Automated Security Testing

- **Pre-commit Hooks:** Security scanning before code commits
- **CI/CD Security Gates:** Automated security testing in pipelines
- **Dependency Scanning:** Regular vulnerability assessment of dependencies
- **Container Scanning:** Security scanning of container images

### Manual Security Testing

- **Penetration Testing:** Annual third-party security assessments
- **Code Reviews:** Security-focused code reviews for all changes
- **Threat Modeling:** Regular threat modeling exercises

## Incident Response

### Security Incident Classification

- **P0 - Critical:** Active exploitation, data breach, service unavailable
- **P1 - High:** Confirmed vulnerability with high impact
- **P2 - Medium:** Potential vulnerability with medium impact
- **P3 - Low:** Security improvement opportunities

### Response Procedures

1. **Detection & Analysis:** Identify and assess the security incident
2. **Containment:** Immediately contain the threat to prevent spread
3. **Eradication:** Remove the threat from the environment
4. **Recovery:** Restore services to normal operation
5. **Post-Incident:** Conduct lessons learned and improve processes

## Compliance

### Standards & Frameworks

- **ISO 27001:** Information Security Management System
- **SOC 2 Type II:** Service Organization Control 2
- **NIST Cybersecurity Framework:** Security controls alignment
- **Azure Security Benchmark:** Microsoft security best practices

### Data Privacy

- **GDPR Compliance:** European General Data Protection Regulation
- **Data Minimization:** Collect only necessary data
- **Data Retention:** Automatic data purging based on retention policies
- **Right to Erasure:** Support for data deletion requests

## Security Training

### Developer Security Training

- **Secure Coding Practices:** Regular training on secure development
- **OWASP Top 10:** Understanding of common vulnerabilities
- **Threat Modeling:** Training on identifying security threats
- **Security Tools:** Proper usage of security scanning tools

### Security Awareness

- **Phishing Simulations:** Regular phishing awareness training
- **Security Policies:** Regular review of security policies
- **Incident Response:** Training on security incident procedures

## Contact Information

For security-related questions or concerns:

**Security Team Lead:** Dwiref Sharma  
**Email:** DwirefS@SapientEdge.io  
**GitHub:** @DwirefS

## Security Updates

Security updates will be communicated through:

- Security advisories on GitHub
- Email notifications to maintainers
- Documentation updates
- Release notes

---

**Last Updated:** 2025-07-18  
**Next Review:** 2025-10-18