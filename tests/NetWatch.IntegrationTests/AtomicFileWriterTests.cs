using System.Text.Json;
using System.Text.Json.Serialization;
using NetWatch.Services;

namespace NetWatch.IntegrationTests;

public sealed class AtomicFileWriterTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "netwatch-atomic-tests", Guid.NewGuid().ToString("N"));
    private string Destination => Path.Combine(_directory, "state.json");

    [Fact]
    public async Task SuccessfulReplacement_LeavesValidJsonAndPreviousVersionBackup()
    {
        await AtomicFileWriter.WriteJsonAsync(Destination, new { version = 1 }, new());
        await AtomicFileWriter.WriteJsonAsync(Destination, new { version = 2 }, new());
        await AtomicFileWriter.WriteJsonAsync(Destination, new { version = 3 }, new());

        using var current = JsonDocument.Parse(await File.ReadAllTextAsync(Destination));
        using var backup = JsonDocument.Parse(await File.ReadAllTextAsync(Path.ChangeExtension(Destination, ".backup.json")));
        Assert.Equal(3, current.RootElement.GetProperty("version").GetInt32());
        Assert.Equal(2, backup.RootElement.GetProperty("version").GetInt32());
        Assert.Empty(Directory.GetFiles(_directory, "*.tmp"));
    }

    [Fact]
    public async Task FailedSerialization_PreservesDestinationAndBackupAndRemovesTemporaryFile()
    {
        await AtomicFileWriter.WriteTextAsync(Destination, "old");
        await AtomicFileWriter.WriteTextAsync(Destination, "current");
        var options = new JsonSerializerOptions();
        options.Converters.Add(new FailingConverter());

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            AtomicFileWriter.WriteJsonAsync(Destination, 42, options));

        Assert.Equal("current", await File.ReadAllTextAsync(Destination));
        Assert.Equal("old", await File.ReadAllTextAsync(Path.ChangeExtension(Destination, ".backup.json")));
        Assert.Empty(Directory.GetFiles(_directory, "*.tmp"));
    }

    [Fact]
    public async Task CancellationAfterSerialization_PreservesDestinationAndRemovesTemporaryFile()
    {
        await AtomicFileWriter.WriteTextAsync(Destination, "original");
        using var cancellation = new CancellationTokenSource();
        var options = new JsonSerializerOptions();
        options.Converters.Add(new CancellingConverter(cancellation));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            AtomicFileWriter.WriteJsonAsync(Destination, 42, options, cancellation.Token));

        Assert.Equal("original", await File.ReadAllTextAsync(Destination));
        Assert.Empty(Directory.GetFiles(_directory, "*.tmp"));
    }

    [Fact]
    public async Task CopyWithoutOverwrite_PreservesExistingDestination()
    {
        await AtomicFileWriter.WriteTextAsync(Destination, "original");
        var source = Path.Combine(_directory, "source.json");
        await AtomicFileWriter.WriteTextAsync(source, "replacement");

        await Assert.ThrowsAsync<IOException>(() => AtomicFileWriter.CopyAsync(source, Destination, overwrite: false));

        Assert.Equal("original", await File.ReadAllTextAsync(Destination));
        Assert.Empty(Directory.GetFiles(_directory, "*.tmp"));
    }

    [Fact]
    public async Task TemporaryWindowsReader_RetriesAtomicReplacementWithoutLosingBackup()
    {
        await AtomicFileWriter.WriteTextAsync(Destination, "original");
        using var reader = new FileStream(Destination, FileMode.Open, FileAccess.Read, FileShare.Read);
        var save = AtomicFileWriter.WriteTextAsync(Destination, "replacement");
        await Task.Delay(100);
        reader.Dispose();
        await save;
        Assert.Equal("replacement", await File.ReadAllTextAsync(Destination));
        Assert.Equal("original", await File.ReadAllTextAsync(Path.ChangeExtension(Destination, ".backup.json")));
        Assert.Empty(Directory.GetFiles(_directory, "*.tmp"));
    }

    [Fact]
    public async Task CancellationDuringSharingRetry_DoesNotReplaceOrLeaveTemporaryFiles()
    {
        await AtomicFileWriter.WriteTextAsync(Destination, "original");
        using var reader = new FileStream(Destination, FileMode.Open, FileAccess.Read, FileShare.Read);
        using var cancellation = new CancellationTokenSource();
        var save = AtomicFileWriter.WriteTextAsync(Destination, "replacement", cancellation.Token);
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => save);
        Assert.Equal("original", await File.ReadAllTextAsync(Destination));
        Assert.Empty(Directory.GetFiles(_directory, "*.tmp"));
    }

    [Fact]
    public async Task NoBackupByteWrites_SustainRepeatedAtomicReplacement()
    {
        byte[] expected=[];
        for(var n=0;n<160;n++)
        {
            expected=System.Text.Encoding.UTF8.GetBytes("{\"sequence\":"+n+",\"payload\":\""+new string('x',n*5)+"\"}");
            await AtomicFileWriter.WriteBytesAsync(Destination,expected,createBackup:false);
            Assert.Equal(expected,await File.ReadAllBytesAsync(Destination));
        }
        Assert.False(File.Exists(Path.ChangeExtension(Destination,".backup.json")));
        Assert.Empty(Directory.GetFiles(_directory,"*.tmp"));
    }

    [Fact]
    public async Task PermanentWindowsReader_FailsBoundedlyWithoutReplacingBytes()
    {
        if(!OperatingSystem.IsWindows()) return;
        await AtomicFileWriter.WriteTextAsync(Destination,"original");
        using var reader=new FileStream(Destination,FileMode.Open,FileAccess.Read,FileShare.ReadWrite);
        var watch=System.Diagnostics.Stopwatch.StartNew();
        await Assert.ThrowsAsync<IOException>(()=>AtomicFileWriter.WriteBytesAsync(Destination,[1,2,3],createBackup:false));
        Assert.InRange(watch.ElapsedMilliseconds,400,5000);
        Assert.Equal("original",await File.ReadAllTextAsync(Destination));
        Assert.Empty(Directory.GetFiles(_directory,"*.tmp"));
    }

    private sealed class FailingConverter : JsonConverter<int>
    {
        public override int Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
            throw new NotSupportedException();
        public override void Write(Utf8JsonWriter writer, int value, JsonSerializerOptions options)
        {
            writer.WriteStartArray();
            throw new InvalidOperationException("Injected serialization failure.");
        }
    }

    private sealed class CancellingConverter(CancellationTokenSource cancellation) : JsonConverter<int>
    {
        public override int Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
            throw new NotSupportedException();
        public override void Write(Utf8JsonWriter writer, int value, JsonSerializerOptions options)
        {
            writer.WriteNumberValue(value);
            cancellation.Cancel();
        }
    }

    public void Dispose()
    {
        if (Directory.Exists(_directory)) Directory.Delete(_directory, recursive: true);
    }
}
