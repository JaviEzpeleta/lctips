"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Player } from "@remotion/player"
import toast from "react-hot-toast"
import { ArrowLeft, Download, Film, Upload, Loader2, X } from "lucide-react"
import { ThankYouVideo } from "@/remotion/ThankYou/ThankYouVideo"
import {
  FPS,
  HEIGHT,
  WIDTH,
  getThankYouDuration,
} from "@/remotion/ThankYou/constants"
import {
  isThankYouExport,
  type ThankYouExport,
} from "@/lib/thankYouRanking"
import {
  listThankYouLibrary,
  removeFromThankYouLibrary,
  saveToThankYouLibrary,
  type ThankYouLibraryEntry,
} from "@/lib/thankYouLibrary"

type RenderState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "rendering"; progress: number }
  | { status: "done"; url: string }
  | { status: "error"; message: string }

const ThankYouStudio = () => {
  const [data, setData] = useState<ThankYouExport | null>(null)
  const [render, setRender] = useState<RenderState>({ status: "idle" })
  const [dragging, setDragging] = useState(false)
  const [library, setLibrary] = useState<ThankYouLibraryEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Surface previously-uploaded JSONs (localStorage) so the user can resume
  // without re-exporting. We only read on mount — it's a client component.
  useEffect(() => {
    setLibrary(listThankYouLibrary())
  }, [])

  const useEntry = useCallback((entry: ThankYouLibraryEntry) => {
    setData(entry.data)
    setRender({ status: "idle" })
    setLibrary(saveToThankYouLibrary(entry.data))
    toast.success(`Resumed @${entry.data.recipient.handle} 💛`)
  }, [])

  const loadFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!isThankYouExport(parsed)) {
          toast.error("That's not a lctips thank-you JSON file")
          return
        }
        if (parsed.ranking.length === 0) {
          toast.error("This export has no supporters in it")
          return
        }
        setData(parsed)
        setRender({ status: "idle" })
        setLibrary(saveToThankYouLibrary(parsed))
        toast.success(`Loaded ${parsed.ranking.length} supporters 💛`)
      } catch {
        toast.error("Could not parse that JSON file")
      }
    }
    reader.readAsText(file)
  }, [])

  const inputProps = data
    ? {
        recipientHandle: data.recipient.handle,
        recipientName: data.recipient.name,
        ranking: data.ranking,
      }
    : null

  const durationInFrames = data
    ? getThankYouDuration(data.ranking.length)
    : 1

  const handleDownload = useCallback(async () => {
    if (!inputProps) return
    setRender({ status: "checking" })
    try {
      const { canRenderMediaOnWeb, renderMediaOnWeb } = await import(
        "@remotion/web-renderer"
      )
      const check = await canRenderMediaOnWeb({ width: WIDTH, height: HEIGHT })
      if (!check.canRender) {
        const msg =
          check.issues.find((i) => i.severity === "error")?.message ??
          "Your browser can't render video. Try Chrome or Edge on desktop."
        setRender({ status: "error", message: msg })
        return
      }
      setRender({ status: "rendering", progress: 0 })
      const result = await renderMediaOnWeb({
        composition: {
          id: "ThankYouVideo",
          component: ThankYouVideo,
          width: WIDTH,
          height: HEIGHT,
          fps: FPS,
          durationInFrames,
          defaultProps: inputProps,
        },
        inputProps,
        onProgress: ({ progress }) =>
          setRender({ status: "rendering", progress }),
      })
      const blob = await result.getBlob()
      const url = URL.createObjectURL(blob)
      setRender({ status: "done", url })
      const a = document.createElement("a")
      a.href = url
      a.download = `${data?.recipient.handle ?? "lctips"}-thank-you.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast.success("Video rendered & downloaded 🎬")
    } catch (e) {
      setRender({
        status: "error",
        message:
          e instanceof Error ? e.message : "Rendering failed unexpectedly",
      })
    }
  }, [inputProps, durationInFrames, data])

  return (
    <div className="max-w-3xl mx-auto w-full px-3 py-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <Film className="w-5 h-5 text-pink-400" />
        <h1 className="text-xl font-bold">Thank-you video studio</h1>
      </div>
      <p className="text-sm text-zinc-400 mb-6">
        Drop the <span className="text-pink-300">thank-you JSON</span> you
        exported from a profile&apos;s tips page. Preview the video, then render
        an MP4 right here in your browser.
      </p>

      {!data && (
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const f = e.dataTransfer.files?.[0]
            if (f) loadFile(f)
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-14 cursor-pointer transition-colors ${
            dragging
              ? "border-pink-400 bg-pink-500/10"
              : "border-zinc-700 bg-black/30 hover:border-pink-500/50"
          }`}
        >
          <Upload className="w-8 h-8 text-pink-400" />
          <span className="text-sm text-zinc-300 font-medium">
            Drop your <code className="text-pink-300">*-thank-you.json</code>{" "}
            here
          </span>
          <span className="text-xs text-zinc-500">or click to browse</span>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) loadFile(f)
            }}
          />
        </label>
      )}

      {!data && library.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-1">
            Resume a recent thank-you
          </h2>
          <p className="text-xs text-zinc-500 mb-3">
            JSONs you uploaded before, kept on this device — no re-export needed.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {library.map((entry) => {
              const r = entry.data.recipient
              return (
                <div
                  key={r.handle}
                  className="group relative flex items-center gap-3 rounded-xl ring-1 ring-zinc-800 bg-black/30 hover:ring-pink-500/50 transition-colors"
                >
                  <button
                    onClick={() => useEntry(entry)}
                    className="flex flex-1 items-center gap-3 p-3 text-left min-w-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.picture ?? ""}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover bg-zinc-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-100 truncate">
                        {r.name || r.handle}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        @{r.handle} · top {entry.data.ranking.length} ·{" "}
                        {new Date(entry.savedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      setLibrary(removeFromThankYouLibrary(r.handle))
                    }
                    aria-label={`Forget ${r.handle}`}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {data && inputProps && (
        <div className="space-y-5">
          <div className="rounded-2xl overflow-hidden ring-1 ring-zinc-800 bg-black">
            <Player
              component={ThankYouVideo}
              inputProps={inputProps}
              durationInFrames={durationInFrames}
              fps={FPS}
              compositionWidth={WIDTH}
              compositionHeight={HEIGHT}
              style={{ width: "100%" }}
              controls
              loop
              autoPlay
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={
                render.status === "checking" || render.status === "rendering"
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {render.status === "rendering" ||
              render.status === "checking" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {render.status === "checking"
                ? "Checking browser…"
                : render.status === "rendering"
                  ? `Rendering ${Math.round(render.progress * 100)}%`
                  : "Render & download MP4"}
            </button>

            <button
              onClick={() => {
                setData(null)
                setRender({ status: "idle" })
              }}
              className="px-4 py-2.5 rounded-lg text-sm text-zinc-300 bg-zinc-800/60 hover:bg-zinc-700/60 transition-colors"
            >
              Load another file
            </button>

            <span className="text-xs text-zinc-500">
              Top {data.ranking.length} · {WIDTH}×{HEIGHT} ·{" "}
              {(durationInFrames / FPS).toFixed(0)}s
            </span>
          </div>

          {render.status === "rendering" && (
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-fuchsia-500 transition-all"
                style={{ width: `${Math.round(render.progress * 100)}%` }}
              />
            </div>
          )}

          {render.status === "error" && (
            <div className="text-sm text-amber-300 bg-amber-500/10 ring-1 ring-amber-500/25 rounded-lg px-4 py-3">
              {render.message}
              <div className="text-xs text-amber-300/70 mt-1">
                Client-side rendering needs WebCodecs — works best on desktop
                Chrome or Edge.
              </div>
            </div>
          )}

          {render.status === "done" && (
            <div className="text-sm text-emerald-300">
              Done! If the download didn&apos;t start,{" "}
              <a
                href={render.url}
                download={`${data.recipient.handle}-thank-you.mp4`}
                className="underline"
              >
                click here
              </a>
              .
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ThankYouStudio
