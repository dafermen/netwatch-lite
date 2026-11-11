namespace NetWatch.Services;

/// <summary>Prevents a second application or offline storage command from using the same content root.</summary>
public sealed class RuntimeDataLease : IDisposable
{
    private readonly FileStream _stream;

    /// <summary>Acquires the local lease; never use a network-shared deployment folder.</summary>
    public RuntimeDataLease(IWebHostEnvironment environment)
    {
        Directory.CreateDirectory(environment.ContentRootPath);
        try
        {
            _stream = new FileStream(Path.Combine(environment.ContentRootPath, ".netwatch-runtime.lock"),
                FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
        }
        catch (IOException exception)
        {
            throw new IOException("This data folder is already in use. Stop its NetWatch instance before storage maintenance.", exception);
        }
    }

    /// <summary>Releases the lease without deleting another process's lock path.</summary>
    public void Dispose() => _stream.Dispose();
}
