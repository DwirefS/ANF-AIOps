/*
 * Unit tests for Azure NetApp Files Accounts Functions
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 */

using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using FluentAssertions;
using System.Net;
using System.Text.Json;
using Azure.ResourceManager.NetApp;
using Azure.ResourceManager.NetApp.Models;
using Azure;
using ANFServer.FunctionDefinitions;
using ANFServer.Services;
using ANFServer.Models;
using ANFServer.Security;

namespace ANFServer.Tests.Unit;

public class AccountsFunctionsTests
{
    private readonly Mock<ILogger<AccountsFunctions>> _mockLogger;
    private readonly Mock<IANFService> _mockANFService;
    private readonly Mock<FunctionContext> _mockFunctionContext;
    private readonly Mock<HttpRequestData> _mockHttpRequest;
    private readonly AccountsFunctions _accountsFunctions;

    public AccountsFunctionsTests()
    {
        _mockLogger = new Mock<ILogger<AccountsFunctions>>();
        _mockANFService = new Mock<IANFService>();
        _mockFunctionContext = new Mock<FunctionContext>();
        _mockHttpRequest = new Mock<HttpRequestData>(_mockFunctionContext.Object);
        
        // Setup service collection for dependency injection
        var services = new ServiceCollection();
        services.AddSingleton(_mockLogger.Object);
        services.AddSingleton(_mockANFService.Object);
        
        var serviceProvider = services.BuildServiceProvider();
        _mockFunctionContext.Setup(x => x.InstanceServices).Returns(serviceProvider);

        _accountsFunctions = new AccountsFunctions(_mockLogger.Object, _mockANFService.Object);
    }

    [Fact]
    public async Task ListAccounts_ValidRequest_ReturnsAccounts()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        
        var mockAccounts = new List<NetAppAccountResource>
        {
            CreateMockNetAppAccount("account1", "eastus"),
            CreateMockNetAppAccount("account2", "westus2")
        };

        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns(subscriptionId);
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns(resourceGroupName);
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        _mockANFService.Setup(x => x.ListAccountsAsync(subscriptionId, resourceGroupName))
                      .ReturnsAsync(mockAccounts);

        // Act
        var result = await _accountsFunctions.ListAccounts(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var responseContent = await GetResponseContent(result);
        var accountsResponse = JsonSerializer.Deserialize<AccountsListResponse>(responseContent);
        
        accountsResponse.Should().NotBeNull();
        accountsResponse.Accounts.Should().HaveCount(2);
        accountsResponse.Accounts.Should().Contain(a => a.Name == "account1");
        accountsResponse.Accounts.Should().Contain(a => a.Name == "account2");
        accountsResponse.Message.Should().Contain("Found 2 NetApp accounts");

        _mockANFService.Verify(x => x.ListAccountsAsync(subscriptionId, resourceGroupName), Times.Once);
    }

    [Fact]
    public async Task ListAccounts_EmptyResult_ReturnsEmptyList()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        
        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns(subscriptionId);
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns(resourceGroupName);
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        _mockANFService.Setup(x => x.ListAccountsAsync(subscriptionId, resourceGroupName))
                      .ReturnsAsync(new List<NetAppAccountResource>());

        // Act
        var result = await _accountsFunctions.ListAccounts(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var responseContent = await GetResponseContent(result);
        var accountsResponse = JsonSerializer.Deserialize<AccountsListResponse>(responseContent);
        
        accountsResponse.Should().NotBeNull();
        accountsResponse.Accounts.Should().BeEmpty();
        accountsResponse.Message.Should().Contain("No NetApp accounts found");
    }

    [Fact]
    public async Task ListAccounts_MissingSubscriptionId_ReturnsBadRequest()
    {
        // Arrange
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns("test-rg");
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        // Act
        var result = await _accountsFunctions.ListAccounts(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        
        var responseContent = await GetResponseContent(result);
        responseContent.Should().Contain("subscriptionId is required");
    }

    [Fact]
    public async Task ListAccounts_MissingResourceGroupName_ReturnsBadRequest()
    {
        // Arrange
        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns("12345678-1234-1234-1234-123456789012");
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        // Act
        var result = await _accountsFunctions.ListAccounts(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        
        var responseContent = await GetResponseContent(result);
        responseContent.Should().Contain("resourceGroupName is required");
    }

    [Fact]
    public async Task ListAccounts_ServiceException_ReturnsInternalServerError()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        
        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns(subscriptionId);
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns(resourceGroupName);
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        _mockANFService.Setup(x => x.ListAccountsAsync(subscriptionId, resourceGroupName))
                      .ThrowsAsync(new RequestFailedException("Azure API error"));

        // Act
        var result = await _accountsFunctions.ListAccounts(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        
        var responseContent = await GetResponseContent(result);
        responseContent.Should().Contain("Azure API error");
    }

    [Fact]
    public async Task GetAccount_ValidRequest_ReturnsAccount()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        var accountName = "test-account";
        
        var mockAccount = CreateMockNetAppAccount(accountName, "eastus");

        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns(subscriptionId);
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns(resourceGroupName);
        _mockHttpRequest.Setup(x => x.Query["accountName"]).Returns(accountName);
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        _mockANFService.Setup(x => x.GetAccountAsync(subscriptionId, resourceGroupName, accountName))
                      .ReturnsAsync(mockAccount);

        // Act
        var result = await _accountsFunctions.GetAccount(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var responseContent = await GetResponseContent(result);
        var accountResponse = JsonSerializer.Deserialize<AccountResponse>(responseContent);
        
        accountResponse.Should().NotBeNull();
        accountResponse.Account.Should().NotBeNull();
        accountResponse.Account.Name.Should().Be(accountName);
        accountResponse.Message.Should().Contain("Retrieved account");
    }

    [Fact]
    public async Task GetAccount_NotFound_ReturnsNotFound()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        var accountName = "nonexistent-account";
        
        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns(subscriptionId);
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns(resourceGroupName);
        _mockHttpRequest.Setup(x => x.Query["accountName"]).Returns(accountName);
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        _mockANFService.Setup(x => x.GetAccountAsync(subscriptionId, resourceGroupName, accountName))
                      .ThrowsAsync(new RequestFailedException(404, "Account not found"));

        // Act
        var result = await _accountsFunctions.GetAccount(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.NotFound);
        
        var responseContent = await GetResponseContent(result);
        responseContent.Should().Contain("Account not found");
    }

    [Fact]
    public async Task CreateAccount_ValidRequest_ReturnsCreatedAccount()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        var accountName = "new-account";
        var location = "eastus";
        
        var createRequest = new CreateAccountRequest
        {
            SubscriptionId = subscriptionId,
            ResourceGroupName = resourceGroupName,
            AccountName = accountName,
            Location = location,
            Tags = new Dictionary<string, string> { { "environment", "test" } }
        };

        var mockAccount = CreateMockNetAppAccount(accountName, location);

        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());
        SetupRequestBody(createRequest);

        _mockANFService.Setup(x => x.CreateAccountAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()))
                      .ReturnsAsync(mockAccount);

        // Act
        var result = await _accountsFunctions.CreateAccount(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.Created);
        
        var responseContent = await GetResponseContent(result);
        var accountResponse = JsonSerializer.Deserialize<AccountResponse>(responseContent);
        
        accountResponse.Should().NotBeNull();
        accountResponse.Account.Should().NotBeNull();
        accountResponse.Account.Name.Should().Be(accountName);
        accountResponse.Message.Should().Contain("successfully created");

        _mockANFService.Verify(x => x.CreateAccountAsync(subscriptionId, resourceGroupName, accountName, location, 
            It.IsAny<Dictionary<string, string>>()), Times.Once);
    }

    [Fact]
    public async Task CreateAccount_InvalidRequest_ReturnsBadRequest()
    {
        // Arrange
        var createRequest = new CreateAccountRequest
        {
            // Missing required fields
            AccountName = "test-account"
        };

        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());
        SetupRequestBody(createRequest);

        // Act
        var result = await _accountsFunctions.CreateAccount(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        
        var responseContent = await GetResponseContent(result);
        responseContent.Should().Contain("validation failed");
    }

    [Fact]
    public async Task DeleteAccount_ValidRequest_ReturnsSuccess()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        var accountName = "account-to-delete";
        
        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns(subscriptionId);
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns(resourceGroupName);
        _mockHttpRequest.Setup(x => x.Query["accountName"]).Returns(accountName);
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        _mockANFService.Setup(x => x.DeleteAccountAsync(subscriptionId, resourceGroupName, accountName))
                      .Returns(Task.CompletedTask);

        // Act
        var result = await _accountsFunctions.DeleteAccount(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var responseContent = await GetResponseContent(result);
        responseContent.Should().Contain("successfully deleted");

        _mockANFService.Verify(x => x.DeleteAccountAsync(subscriptionId, resourceGroupName, accountName), Times.Once);
    }

    [Fact]
    public async Task DeleteAccount_AccountNotFound_ReturnsNotFound()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        var accountName = "nonexistent-account";
        
        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns(subscriptionId);
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns(resourceGroupName);
        _mockHttpRequest.Setup(x => x.Query["accountName"]).Returns(accountName);
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        _mockANFService.Setup(x => x.DeleteAccountAsync(subscriptionId, resourceGroupName, accountName))
                      .ThrowsAsync(new RequestFailedException(404, "Account not found"));

        // Act
        var result = await _accountsFunctions.DeleteAccount(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteAccount_AccountWithActiveResources_ReturnsConflict()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        var accountName = "account-with-resources";
        
        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns(subscriptionId);
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns(resourceGroupName);
        _mockHttpRequest.Setup(x => x.Query["accountName"]).Returns(accountName);
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        _mockANFService.Setup(x => x.DeleteAccountAsync(subscriptionId, resourceGroupName, accountName))
                      .ThrowsAsync(new RequestFailedException(409, "Cannot delete account with active capacity pools"));

        // Act
        var result = await _accountsFunctions.DeleteAccount(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.Conflict);
        
        var responseContent = await GetResponseContent(result);
        responseContent.Should().Contain("active capacity pools");
    }

    // Helper methods
    private static NetAppAccountResource CreateMockNetAppAccount(string name, string location)
    {
        var mockAccount = Mock.Of<NetAppAccountResource>();
        Mock.Get(mockAccount).Setup(x => x.Data).Returns(new NetAppAccountData(
            new AzureLocation(location),
            resourceId: $"/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/{name}")
        {
            Name = name,
            Tags = { { "environment", "test" } }
        });
        
        return mockAccount;
    }

    private async Task<string> GetResponseContent(HttpResponseData response)
    {
        response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(response.Body);
        return await reader.ReadToEndAsync();
    }

    private void SetupRequestBody<T>(T requestObject)
    {
        var json = JsonSerializer.Serialize(requestObject);
        var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(json));
        _mockHttpRequest.Setup(x => x.Body).Returns(stream);
    }
}