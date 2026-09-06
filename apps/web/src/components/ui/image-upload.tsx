"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getImageSrc } from "@/lib/utils";
import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  prefix?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(getImageSrc(value));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync do preview com a prop value
    setPreview(getImageSrc(value));
  }, [value]);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post<{ key: string; url: string }>(
          "/admin/images",
          formData as unknown as Record<string, unknown>,
        );

        setPreview(getImageSrc(response.url));
        onChange(response.url);
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setIsUploading(false);
      }
    },
    [onChange],
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    onChange(null);
  }, [onChange]);

  return (
    <div className={className}>
      {preview ? (
        <div className="relative inline-block">
          <Image
            src={preview}
            alt="Preview"
            width={200}
            height={200}
            className="rounded-lg border object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 transition-colors hover:bg-muted">
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clique para enviar uma imagem</span>
              <span className="text-xs text-muted-foreground">PNG, JPG, WEBP (max 5MB)</span>
            </>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleUpload}
            disabled={isUploading}
          />
        </label>
      )}
    </div>
  );
}
