using System.Text;
using System.Text.Json;

namespace NetWatch.Services;

/// <summary>Publishes complete files using a temporary sibling and an atomic replacement.</summary>
public static class AtomicFileWriter
{
    /// <summary>Serializes JSON without changing the destination until serialization and flushing succeed.</summary>
    public static Task WriteJsonAsync<T>(string filePath, T value, JsonSerializerOptions options,
        CancellationToken cancellationToken = default, bool createBackup = true)
    {
        return WriteAsync(filePath, stream => JsonSerializer.SerializeAsync(stream, value, options, cancellationToken),
            cancellationToken, createBackup);
    }

    /// <summary>Writes UTF-8 text using the same replacement guarantees as JSON persistence.</summary>
    public static Task WriteTextAsync(string filePath, string text, CancellationToken cancellationToken = default)
    {
        return WriteAsync(filePath, async stream =>
        {
            var bytes = Encoding.UTF8.GetBytes(text);
            await stream.WriteAsync(bytes, cancellationToken);
        }, cancellationToken);
    }

    /// <summary>Publishes exact document bytes, including unknown JSON fields and encoding markers.</summary>
    public static Task WriteBytesAsync(string filePath, byte[] bytes, CancellationToken cancellationToken = default, bool createBackup = true) =>
        WriteAsync(filePath, async stream => await stream.WriteAsync(bytes, cancellationToken), cancellationToken, createBackup);

    /// <summary>Copies a file completely before publishing the destination.</summary>
    public static Task CopyAsync(string sourcePath, string filePath, bool overwrite,
        CancellationToken cancellationToken = default)
    {
        return WriteAsync(filePath, async stream =>
        {
            await using var source = File.OpenRead(sourcePath);
            await source.CopyToAsync(stream, cancellationToken);
        }, cancellationToken, overwrite: overwrite);
    }

    private static async Task WriteAsync(string filePath, Func<FileStream, Task> write,
        CancellationToken cancellationToken, bool createBackup = true, bool overwrite = true)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var destination = Path.GetFullPath(filePath);
        var directory = Path.GetDirectoryName(destination)!;
        Directory.CreateDirectory(directory);
        var temporary = Path.Combine(directory, $".netwatch-{Guid.NewGuid():N}.tmp");
        var retainStagedRecovery = false;
        try
        {
            await using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write,
                FileShare.None, 65536, FileOptions.Asynchronous))
            {
                await write(stream);
                await stream.FlushAsync(cancellationToken);
                stream.Flush(flushToDisk: true);
            }

            cancellationToken.ThrowIfCancellationRequested();
            for (var attempt = 0; ; attempt++)
            {
                try
                {
                    if (overwrite && File.Exists(destination))
                    {
                        var backup = createBackup ? Path.ChangeExtension(destination, ".backup.json") : null;
                        File.Replace(temporary, destination, backup);
                    }
                    else
                    {
                        File.Move(temporary, destination);
                    }
                    break;
                }
                catch (IOException exception) when (attempt < 6 &&
                    ((exception.HResult & 0xffff) is 32 or 33 ||
                     (exception.HResult & 0xffff) == 1175 && File.Exists(temporary) && File.Exists(destination)))
                {
                    // ReplaceFileW 1175 retains both names; unlike 1176/1177 it is safe to retry.
                    await Task.Delay(25 * (attempt + 1), cancellationToken);
                }
                catch (IOException exception) when ((exception.HResult & 0xffff) is 1176 or 1177)
                {
                    // Native partial replacement: retain the staged bytes for offline recovery.
                    retainStagedRecovery = true;
                    throw;
                }
            }
        }
        finally
        {
            // Cleanup must not hide a serialization or filesystem failure.
            try { if (!retainStagedRecovery) File.Delete(temporary); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }
}
