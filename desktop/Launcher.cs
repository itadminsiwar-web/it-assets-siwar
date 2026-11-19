// ThreePillars-IT.exe — برنامج Windows لنظام Three Pillars · IT
// • ملفات النظام كلها جوه الـ exe (Embedded) وبتتخدم من 127.0.0.1 بس (مش متاحة على الشبكة)
// • بيفتح النظام في شباك لوحده (Microsoft Edge في وضع App) ببروفايل خاص في %LOCALAPPDATA%\ThreePillarsIT
// • قفل الشباك = قفل البرنامج · أول تشغيل بيعمل اختصار على سطح المكتب وقائمة Start
// • مفيش أي تثبيت مطلوب (بيستخدم .NET Framework و Edge الموجودين في Windows)
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("Three Pillars · IT")]
[assembly: AssemblyProduct("Three Pillars · IT Administration")]
[assembly: AssemblyCompany("Three Pillars")]
[assembly: AssemblyCopyright("Developed by Eng. Mahmoud Ebrahim")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

static class Launcher
{
    const int PORT = 47615;               // ثابت: البيانات (localStorage) مربوطة بالعنوان ده
    const string APPNAME = "Three Pillars IT";
    static readonly string Home = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ThreePillarsIT");
    static readonly string Profile = Path.Combine(Home, "profile");
    static readonly string LogFile = Path.Combine(Home, "app.log");
    static readonly Dictionary<string, string> Types = new Dictionary<string, string> {
        { ".html", "text/html; charset=utf-8" }, { ".js", "application/javascript; charset=utf-8" }, { ".css", "text/css; charset=utf-8" },
        { ".json", "application/json; charset=utf-8" }, { ".png", "image/png" }, { ".svg", "image/svg+xml" }, { ".ico", "image/x-icon" },
        { ".jpg", "image/jpeg" }, { ".webp", "image/webp" }, { ".woff2", "font/woff2" }, { ".csv", "text/csv; charset=utf-8" }, { ".txt", "text/plain; charset=utf-8" } };
    static Assembly Asm = Assembly.GetExecutingAssembly();
    static volatile bool Running = true;

    [STAThread]
    static void Main(string[] args)
    {
        Directory.CreateDirectory(Home);
        Log("start " + string.Join(" ", args));
        TcpListener server = null;
        try { server = new TcpListener(IPAddress.Loopback, PORT); server.Start(); }
        catch (SocketException)
        {
            // البرنامج شغال بالفعل؟ ← نفتح شباك جديد بس
            if (Ping()) { OpenWindow(); return; }
            MessageBox.Show("المنفذ " + PORT + " مستخدم من برنامج تاني.\nاقفل البرنامج ده وجرّب تاني.", APPNAME, MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }
        var t = new Thread(() => Serve(server)); t.IsBackground = true; t.Start();
        // للاختبار: سيرفر بس من غير شباك ولا اختصارات (لحد ما البرنامج يتقفل)
        if (Array.IndexOf(args, "--serve-only") >= 0) { Thread.Sleep(Timeout.Infinite); return; }
        try { Shortcuts(); } catch (Exception e) { Log("shortcut: " + e.Message); }
        Process p = OpenWindow();
        if (p == null) { MessageBox.Show("مش لاقي Microsoft Edge على الجهاز.", APPNAME, MessageBoxButtons.OK, MessageBoxIcon.Error); return; }
        // نفضل شغالين طول ما فيه شباك مفتوح للبرنامج (ممكن يبقى أكتر من شباك)
        try { p.WaitForExit(); } catch { }
        while (WindowsOpen()) Thread.Sleep(3000);
        Running = false; try { server.Stop(); } catch { }
        Log("exit");
    }

    static string EdgePath()
    {
        string[] c = {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe") };
        foreach (var x in c) if (File.Exists(x)) return x;
        return null;
    }

    static Process OpenWindow()
    {
        string edge = EdgePath(); if (edge == null) return null;
        var psi = new ProcessStartInfo(edge, "--app=http://127.0.0.1:" + PORT + "/it.html --user-data-dir=\"" + Profile + "\" --no-first-run --no-default-browser-check --window-size=1440,900 --disable-features=Translate");
        psi.UseShellExecute = false;
        return Process.Start(psi);
    }

    static bool WindowsOpen()
    {
        try
        {
            using (var s = new ManagementObjectSearcher("SELECT CommandLine FROM Win32_Process WHERE Name='msedge.exe'"))
                foreach (ManagementObject o in s.Get())
                {
                    var cl = o["CommandLine"] as string;
                    if (cl != null && cl.IndexOf(Profile, StringComparison.OrdinalIgnoreCase) >= 0 && cl.IndexOf("--type=", StringComparison.OrdinalIgnoreCase) < 0) return true;
                }
        }
        catch (Exception e) { Log("wmi: " + e.Message); }
        return false;
    }

    static bool Ping()
    {
        try { using (var w = new WebClient()) return w.DownloadString("http://127.0.0.1:" + PORT + "/__tpit").StartsWith("tp-it"); }
        catch { return false; }
    }

    // ---------- سيرفر صغير على 127.0.0.1 بس ----------
    static void Serve(TcpListener server)
    {
        while (Running)
        {
            TcpClient c;
            try { c = server.AcceptTcpClient(); } catch { break; }
            ThreadPool.QueueUserWorkItem(_ => Handle(c));
        }
    }

    static void Handle(TcpClient c)
    {
        try
        {
            using (c)
            using (var ns = c.GetStream())
            {
                ns.ReadTimeout = 5000;
                var buf = new byte[8192]; int n = ns.Read(buf, 0, buf.Length); if (n <= 0) return;
                string req = Encoding.ASCII.GetString(buf, 0, n);
                string first = req.Split('\n')[0]; string[] parts = first.Split(' ');
                if (parts.Length < 2) return;
                string path = Uri.UnescapeDataString(parts[1].Split('?')[0].Split('#')[0]).TrimStart('/');
                if (path == "__tpit") { Send(ns, 200, "text/plain", Encoding.UTF8.GetBytes("tp-it ok")); return; }
                if (path == "") path = "it.html";
                if (path.Contains("..")) { Send(ns, 403, "text/plain", Encoding.UTF8.GetBytes("forbidden")); return; }
                byte[] data = Res(path);
                if (data == null) { Send(ns, 404, "text/plain", Encoding.UTF8.GetBytes("not found: " + path)); return; }
                string ext = Path.GetExtension(path).ToLowerInvariant(), type;
                if (!Types.TryGetValue(ext, out type)) type = "application/octet-stream";
                Send(ns, 200, type, data);
            }
        }
        catch (Exception e) { Log("req: " + e.Message); }
    }

    static byte[] Res(string path)
    {
        string name = "web/" + path.Replace('\\', '/');
        using (var s = Asm.GetManifestResourceStream(name))
        {
            if (s == null) return null;
            using (var m = new MemoryStream()) { s.CopyTo(m); return m.ToArray(); }
        }
    }

    static void Send(NetworkStream ns, int code, string type, byte[] body)
    {
        string status = code == 200 ? "OK" : code == 404 ? "Not Found" : "Forbidden";
        string h = "HTTP/1.1 " + code + " " + status + "\r\nContent-Type: " + type + "\r\nContent-Length: " + body.Length +
            "\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n";
        byte[] hb = Encoding.ASCII.GetBytes(h);
        ns.Write(hb, 0, hb.Length); ns.Write(body, 0, body.Length);
    }

    // ---------- اختصارات سطح المكتب وقائمة Start (أول مرة بس) ----------
    static void Shortcuts()
    {
        string exe = Assembly.GetExecutingAssembly().Location;
        string desk = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), APPNAME + ".lnk");
        string start = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), APPNAME + ".lnk");
        foreach (var lnk in new[] { desk, start })
        {
            if (File.Exists(lnk)) continue;
            Type t = Type.GetTypeFromProgID("WScript.Shell");
            object sh = Activator.CreateInstance(t);
            object sc = t.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, sh, new object[] { lnk });
            Type st = sc.GetType();
            st.InvokeMember("TargetPath", BindingFlags.SetProperty, null, sc, new object[] { exe });
            st.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, sc, new object[] { Path.GetDirectoryName(exe) });
            st.InvokeMember("IconLocation", BindingFlags.SetProperty, null, sc, new object[] { exe + ",0" });
            st.InvokeMember("Description", BindingFlags.SetProperty, null, sc, new object[] { "Three Pillars · IT Administration" });
            st.InvokeMember("Save", BindingFlags.InvokeMethod, null, sc, null);
        }
    }

    static void Log(string s) { try { File.AppendAllText(LogFile, DateTime.Now.ToString("s") + "  " + s + Environment.NewLine); } catch { } }
}
