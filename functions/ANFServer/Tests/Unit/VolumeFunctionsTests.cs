/*
 * Unit tests for Azure NetApp Files Volume Functions
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

namespace ANFServer.Tests.Unit;

public class VolumeFunctionsTests
{
    private readonly Mock<ILogger<VolumeFunctions>> _mockLogger;
    private readonly Mock<IANFService> _mockANFService;
    private readonly Mock<FunctionContext> _mockFunctionContext;
    private readonly Mock<HttpRequestData> _mockHttpRequest;
    private readonly VolumeFunctions _volumeFunctions;

    public VolumeFunctionsTests()
    {
        _mockLogger = new Mock<ILogger<VolumeFunctions>>();
        _mockANFService = new Mock<IANFService>();
        _mockFunctionContext = new Mock<FunctionContext>();
        _mockHttpRequest = new Mock<HttpRequestData>(_mockFunctionContext.Object);
        
        var services = new ServiceCollection();
        services.AddSingleton(_mockLogger.Object);
        services.AddSingleton(_mockANFService.Object);
        
        var serviceProvider = services.BuildServiceProvider();
        _mockFunctionContext.Setup(x => x.InstanceServices).Returns(serviceProvider);

        _volumeFunctions = new VolumeFunctions(_mockLogger.Object, _mockANFService.Object);
    }

    [Fact]
    public async Task ListVolumes_ValidRequest_ReturnsVolumes()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        var accountName = "test-account";
        var poolName = "test-pool";
        
        var mockVolumes = new List<NetAppVolumeResource>
        {
            CreateMockNetAppVolume("volume1", "Premium", 100),
            CreateMockNetAppVolume("volume2", "Standard", 200)
        };

        SetupQueryParameters(subscriptionId, resourceGroupName, accountName, poolName);

        _mockANFService.Setup(x => x.ListVolumesAsync(subscriptionId, resourceGroupName, accountName, poolName))
                      .ReturnsAsync(mockVolumes);

        // Act
        var result = await _volumeFunctions.ListVolumes(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var responseContent = await GetResponseContent(result);
        var volumesResponse = JsonSerializer.Deserialize<VolumesListResponse>(responseContent);
        
        volumesResponse.Should().NotBeNull();
        volumesResponse.Volumes.Should().HaveCount(2);
        volumesResponse.Volumes.Should().Contain(v => v.Name == "volume1");
        volumesResponse.Volumes.Should().Contain(v => v.Name == "volume2");
        volumesResponse.Message.Should().Contain("Found 2 volumes");
    }

    [Fact]
    public async Task ListVolumes_EmptyResult_ReturnsEmptyList()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        var accountName = "test-account";
        var poolName = "test-pool";
        
        SetupQueryParameters(subscriptionId, resourceGroupName, accountName, poolName);

        _mockANFService.Setup(x => x.ListVolumesAsync(subscriptionId, resourceGroupName, accountName, poolName))
                      .ReturnsAsync(new List<NetAppVolumeResource>());

        // Act
        var result = await _volumeFunctions.ListVolumes(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var responseContent = await GetResponseContent(result);
        var volumesResponse = JsonSerializer.Deserialize<VolumesListResponse>(responseContent);
        
        volumesResponse.Should().NotBeNull();
        volumesResponse.Volumes.Should().BeEmpty();
        volumesResponse.Message.Should().Contain("No volumes found");
    }

    [Fact]
    public async Task GetVolume_ValidRequest_ReturnsVolume()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        var accountName = "test-account";
        var poolName = "test-pool";
        var volumeName = "test-volume";
        
        var mockVolume = CreateMockNetAppVolume(volumeName, "Premium", 100);

        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns(subscriptionId);
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns(resourceGroupName);
        _mockHttpRequest.Setup(x => x.Query["accountName"]).Returns(accountName);
        _mockHttpRequest.Setup(x => x.Query["poolName"]).Returns(poolName);
        _mockHttpRequest.Setup(x => x.Query["volumeName"]).Returns(volumeName);
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        _mockANFService.Setup(x => x.GetVolumeAsync(subscriptionId, resourceGroupName, accountName, poolName, volumeName))
                      .ReturnsAsync(mockVolume);

        // Act
        var result = await _volumeFunctions.GetVolume(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var responseContent = await GetResponseContent(result);
        var volumeResponse = JsonSerializer.Deserialize<VolumeResponse>(responseContent);
        
        volumeResponse.Should().NotBeNull();
        volumeResponse.Volume.Should().NotBeNull();
        volumeResponse.Volume.Name.Should().Be(volumeName);
        volumeResponse.Message.Should().Contain("Retrieved volume");
    }

    [Fact]
    public async Task CreateVolume_ValidRequest_ReturnsCreatedVolume()
    {
        // Arrange
        var createRequest = new CreateVolumeRequest
        {
            SubscriptionId = "12345678-1234-1234-1234-123456789012",
            ResourceGroupName = "test-rg",
            AccountName = "test-account",
            PoolName = "test-pool",
            VolumeName = "new-volume",
            Location = "eastus",
            ServiceLevel = "Premium",
            UsageThreshold = 107374182400, // 100 GiB
            CreationToken = "new-volume",
            SubnetId = "/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet",
            ExportPolicy = new VolumeExportPolicy
            {
                Rules = new List<ExportPolicyRule>
                {
                    new ExportPolicyRule
                    {
                        RuleIndex = 1,
                        UnixReadWrite = true,
                        Nfsv3 = true,
                        AllowedClients = "10.0.0.0/24"
                    }
                }
            }
        };

        var mockVolume = CreateMockNetAppVolume(createRequest.VolumeName, createRequest.ServiceLevel, 100);

        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());
        SetupRequestBody(createRequest);

        _mockANFService.Setup(x => x.CreateVolumeAsync(It.IsAny<CreateVolumeRequest>()))
                      .ReturnsAsync(mockVolume);

        // Act
        var result = await _volumeFunctions.CreateVolume(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.Created);
        
        var responseContent = await GetResponseContent(result);
        var volumeResponse = JsonSerializer.Deserialize<VolumeResponse>(responseContent);
        
        volumeResponse.Should().NotBeNull();
        volumeResponse.Volume.Should().NotBeNull();
        volumeResponse.Volume.Name.Should().Be(createRequest.VolumeName);
        volumeResponse.Message.Should().Contain("successfully created");

        _mockANFService.Verify(x => x.CreateVolumeAsync(It.Is<CreateVolumeRequest>(req => 
            req.VolumeName == createRequest.VolumeName && 
            req.ServiceLevel == createRequest.ServiceLevel)), Times.Once);
    }

    [Fact]
    public async Task CreateVolume_InvalidServiceLevel_ReturnsBadRequest()
    {
        // Arrange
        var createRequest = new CreateVolumeRequest
        {
            SubscriptionId = "12345678-1234-1234-1234-123456789012",
            ResourceGroupName = "test-rg",
            AccountName = "test-account",
            PoolName = "test-pool",
            VolumeName = "new-volume",
            Location = "eastus",
            ServiceLevel = "InvalidLevel", // Invalid service level
            UsageThreshold = 107374182400,
            CreationToken = "new-volume",
            SubnetId = "/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet"
        };

        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());
        SetupRequestBody(createRequest);

        // Act
        var result = await _volumeFunctions.CreateVolume(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        
        var responseContent = await GetResponseContent(result);
        responseContent.Should().Contain("Invalid service level");
    }

    [Fact]
    public async Task CreateVolume_InvalidUsageThreshold_ReturnsBadRequest()
    {
        // Arrange
        var createRequest = new CreateVolumeRequest
        {
            SubscriptionId = "12345678-1234-1234-1234-123456789012",
            ResourceGroupName = "test-rg",
            AccountName = "test-account",
            PoolName = "test-pool",
            VolumeName = "new-volume",
            Location = "eastus",
            ServiceLevel = "Premium",
            UsageThreshold = 1024, // Too small (minimum is 100 GiB)
            CreationToken = "new-volume",
            SubnetId = "/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet"
        };

        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());
        SetupRequestBody(createRequest);

        // Act
        var result = await _volumeFunctions.CreateVolume(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        
        var responseContent = await GetResponseContent(result);
        responseContent.Should().Contain("Usage threshold must be at least");
    }

    [Fact]
    public async Task UpdateVolume_ValidRequest_ReturnsUpdatedVolume()
    {
        // Arrange
        var updateRequest = new UpdateVolumeRequest
        {
            SubscriptionId = "12345678-1234-1234-1234-123456789012",
            ResourceGroupName = "test-rg",
            AccountName = "test-account",
            PoolName = "test-pool",
            VolumeName = "test-volume",
            UsageThreshold = 214748364800, // 200 GiB
            Tags = new Dictionary<string, string> { { "updated", "true" } }
        };

        var mockVolume = CreateMockNetAppVolume(updateRequest.VolumeName, "Premium", 200);

        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());
        SetupRequestBody(updateRequest);

        _mockANFService.Setup(x => x.UpdateVolumeAsync(It.IsAny<UpdateVolumeRequest>()))
                      .ReturnsAsync(mockVolume);

        // Act
        var result = await _volumeFunctions.UpdateVolume(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var responseContent = await GetResponseContent(result);
        var volumeResponse = JsonSerializer.Deserialize<VolumeResponse>(responseContent);
        
        volumeResponse.Should().NotBeNull();
        volumeResponse.Volume.Should().NotBeNull();
        volumeResponse.Message.Should().Contain("successfully updated");

        _mockANFService.Verify(x => x.UpdateVolumeAsync(It.IsAny<UpdateVolumeRequest>()), Times.Once);
    }

    [Fact]
    public async Task DeleteVolume_ValidRequest_ReturnsSuccess()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        var accountName = "test-account";
        var poolName = "test-pool";
        var volumeName = "volume-to-delete";
        
        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns(subscriptionId);
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns(resourceGroupName);
        _mockHttpRequest.Setup(x => x.Query["accountName"]).Returns(accountName);
        _mockHttpRequest.Setup(x => x.Query["poolName"]).Returns(poolName);
        _mockHttpRequest.Setup(x => x.Query["volumeName"]).Returns(volumeName);
        _mockHttpRequest.Setup(x => x.Query["forceDelete"]).Returns("false");
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        _mockANFService.Setup(x => x.DeleteVolumeAsync(subscriptionId, resourceGroupName, accountName, poolName, volumeName, false))
                      .Returns(Task.CompletedTask);

        // Act
        var result = await _volumeFunctions.DeleteVolume(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var responseContent = await GetResponseContent(result);
        responseContent.Should().Contain("successfully deleted");

        _mockANFService.Verify(x => x.DeleteVolumeAsync(subscriptionId, resourceGroupName, accountName, poolName, volumeName, false), Times.Once);
    }

    [Fact]
    public async Task DeleteVolume_ForceDelete_ReturnsSuccess()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        var accountName = "test-account";
        var poolName = "test-pool";
        var volumeName = "volume-to-force-delete";
        
        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns(subscriptionId);
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns(resourceGroupName);
        _mockHttpRequest.Setup(x => x.Query["accountName"]).Returns(accountName);
        _mockHttpRequest.Setup(x => x.Query["poolName"]).Returns(poolName);
        _mockHttpRequest.Setup(x => x.Query["volumeName"]).Returns(volumeName);
        _mockHttpRequest.Setup(x => x.Query["forceDelete"]).Returns("true");
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        _mockANFService.Setup(x => x.DeleteVolumeAsync(subscriptionId, resourceGroupName, accountName, poolName, volumeName, true))
                      .Returns(Task.CompletedTask);

        // Act
        var result = await _volumeFunctions.DeleteVolume(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var responseContent = await GetResponseContent(result);
        responseContent.Should().Contain("force deleted");

        _mockANFService.Verify(x => x.DeleteVolumeAsync(subscriptionId, resourceGroupName, accountName, poolName, volumeName, true), Times.Once);
    }

    [Fact]
    public async Task DeleteVolume_VolumeNotFound_ReturnsNotFound()
    {
        // Arrange
        var subscriptionId = "12345678-1234-1234-1234-123456789012";
        var resourceGroupName = "test-rg";
        var accountName = "test-account";
        var poolName = "test-pool";
        var volumeName = "nonexistent-volume";
        
        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns(subscriptionId);
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns(resourceGroupName);
        _mockHttpRequest.Setup(x => x.Query["accountName"]).Returns(accountName);
        _mockHttpRequest.Setup(x => x.Query["poolName"]).Returns(poolName);
        _mockHttpRequest.Setup(x => x.Query["volumeName"]).Returns(volumeName);
        _mockHttpRequest.Setup(x => x.Query["forceDelete"]).Returns("false");
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());

        _mockANFService.Setup(x => x.DeleteVolumeAsync(subscriptionId, resourceGroupName, accountName, poolName, volumeName, false))
                      .ThrowsAsync(new RequestFailedException(404, "Volume not found"));

        // Act
        var result = await _volumeFunctions.DeleteVolume(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("Premium", 16.0)]
    [InlineData("Standard", 4.0)]
    [InlineData("Ultra", 32.0)]
    public async Task CreateVolume_ValidServiceLevels_CalculatesCorrectThroughput(string serviceLevel, double expectedThroughput)
    {
        // Arrange
        var createRequest = new CreateVolumeRequest
        {
            SubscriptionId = "12345678-1234-1234-1234-123456789012",
            ResourceGroupName = "test-rg",
            AccountName = "test-account",
            PoolName = "test-pool",
            VolumeName = "throughput-test-volume",
            Location = "eastus",
            ServiceLevel = serviceLevel,
            UsageThreshold = 107374182400, // 100 GiB
            CreationToken = "throughput-test-volume",
            SubnetId = "/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet"
        };

        var mockVolume = CreateMockNetAppVolume(createRequest.VolumeName, serviceLevel, 100);

        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());
        SetupRequestBody(createRequest);

        _mockANFService.Setup(x => x.CreateVolumeAsync(It.IsAny<CreateVolumeRequest>()))
                      .ReturnsAsync(mockVolume);

        // Act
        var result = await _volumeFunctions.CreateVolume(_mockHttpRequest.Object, _mockFunctionContext.Object);

        // Assert
        result.StatusCode.Should().Be(HttpStatusCode.Created);
        
        // Verify the service was called with correct throughput calculation
        _mockANFService.Verify(x => x.CreateVolumeAsync(It.Is<CreateVolumeRequest>(req => 
            req.ServiceLevel == serviceLevel)), Times.Once);
    }

    // Helper methods
    private void SetupQueryParameters(string subscriptionId, string resourceGroupName, string accountName, string poolName)
    {
        _mockHttpRequest.Setup(x => x.Query["subscriptionId"]).Returns(subscriptionId);
        _mockHttpRequest.Setup(x => x.Query["resourceGroupName"]).Returns(resourceGroupName);
        _mockHttpRequest.Setup(x => x.Query["accountName"]).Returns(accountName);
        _mockHttpRequest.Setup(x => x.Query["poolName"]).Returns(poolName);
        _mockHttpRequest.Setup(x => x.Headers).Returns(new HttpHeadersCollection());
    }

    private static NetAppVolumeResource CreateMockNetAppVolume(string name, string serviceLevel, long sizeGiB)
    {
        var mockVolume = Mock.Of<NetAppVolumeResource>();
        var usageThreshold = sizeGiB * 1024 * 1024 * 1024; // Convert GiB to bytes
        
        Mock.Get(mockVolume).Setup(x => x.Data).Returns(new NetAppVolumeData(
            new AzureLocation("eastus"),
            resourceId: $"/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account/capacityPools/test-pool/volumes/{name}")
        {
            Name = name,
            UsageThreshold = usageThreshold,
            CreationToken = name,
            ServiceLevel = Enum.Parse<NetAppFileServiceLevel>(serviceLevel),
            SubnetId = "/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet",
            ProvisioningState = "Succeeded",
            FileSystemId = Guid.NewGuid().ToString(),
            MountTargets = 
            {
                new NetAppVolumeMountTarget
                {
                    MountTargetId = Guid.NewGuid().ToString(),
                    FileSystemId = Guid.NewGuid().ToString(),
                    IPAddress = "10.0.1.4"
                }
            },
            ExportPolicy = new NetAppVolumeExportPolicy
            {
                Rules = 
                {
                    new NetAppVolumeExportPolicyRule(1)
                    {
                        UnixReadWrite = true,
                        Nfsv3 = true,
                        AllowedClients = "10.0.0.0/24",
                        HasRootAccess = true
                    }
                }
            },
            Tags = { { "environment", "test" } }
        });
        
        return mockVolume;
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