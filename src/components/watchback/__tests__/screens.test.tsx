// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "@/copy/en";
import { contrastViolations } from "@/test-utils/contrast";
import { MonogramSticker } from "@/components/paper";
import { Crunching, Landing, Upload } from "../screens";

afterEach(cleanup);

describe("pre-story screens", () => {
  it("landing shows privacy.body in full, the CTA and the disclaimer", () => {
    const onStart = vi.fn();
    render(<Landing onStart={onStart} />);
    expect(screen.getByTestId("privacy-body").textContent).toBe(en.privacy.body);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(en.landing.headline.last12);
    expect(screen.getByText(en.disclaimer)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(en.landing.cta) }));
    expect(onStart).toHaveBeenCalled();
    expect(contrastViolations(document.body)).toEqual([]);
  });

  it("upload: the whole cassette is the label for the .zip input and shows cassetteLabel; errors in tomato with a rule", () => {
    const onFiles = vi.fn();
    const { rerender } = render(<Upload onFiles={onFiles} error={null} />);
    const input = screen.getByLabelText(new RegExp(en.upload.dropzone)) as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toContain(".zip");
    const zone = screen.getByTestId("dropzone");
    expect(zone.textContent).toContain(en.upload.cassetteLabel);
    expect(zone.textContent).toContain(en.upload.dropzoneAlt);
    const file = new File(["x"], "takeout.zip", { type: "application/zip" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } });
    expect(zone.dataset.dragover).toBe("true");
    rerender(<Upload onFiles={onFiles} error={en.errors.notTakeout} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe(en.errors.notTakeout);
    expect(alert.className).toMatch(/border-l-2/);
    expect(alert.className).toMatch(/text-tomato/);
    expect(screen.getByTestId("dropzone").className).toMatch(/shake/);
    expect(contrastViolations(document.body)).toEqual([]);
  });

  it("MonogramSticker: role=img named after the creator, initials + hashed palette", () => {
    render(<MonogramSticker name="見本チャンネル" size={40} />);
    const img = screen.getByRole("img", { name: "見本チャンネル" });
    expect(img.textContent).toBe("見");
    expect(Number(img.dataset.palette)).toBeGreaterThanOrEqual(0);
  });

  it("crunching: phase label while unzipping/reading with nothing counted, then the live counter", () => {
    const { rerender } = render(<Crunching count={0} fraction={0.2} phase="reading" />);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe(en.crunching.unzipping);
    expect(status.textContent).not.toMatch(/\b0\b/);
    rerender(<Crunching count={12500} fraction={0.7} phase="parsing" />);
    expect(screen.getByRole("status").textContent).toContain(en.crunching.counter.replace("{n}", "12,500"));
    rerender(<Crunching count={100000} fraction={1} phase="reading" />); // a later file (search history) inflating
    expect(screen.getByRole("status").textContent).toContain("100,000");
  });
});
