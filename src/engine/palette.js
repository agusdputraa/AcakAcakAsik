export function attachPalette(engine) {
    const GROUP_PALETTE = [
        { name: 'Kelompok 1', hex: '#ef4444', threeColor: 0xef4444, badgeBg: 'bg-rose-600', lightBg: 'bg-rose-50/90', border: 'border-rose-200', text: 'text-rose-800' },
        { name: 'Kelompok 2', hex: '#3b82f6', threeColor: 0x3b82f6, badgeBg: 'bg-blue-600', lightBg: 'bg-blue-50/90', border: 'border-blue-200', text: 'text-blue-800' },
        { name: 'Kelompok 3', hex: '#10b981', threeColor: 0x10b981, badgeBg: 'bg-emerald-600', lightBg: 'bg-emerald-50/90', border: 'border-emerald-200', text: 'text-emerald-800' },
        { name: 'Kelompok 4', hex: '#f59e0b', threeColor: 0xf59e0b, badgeBg: 'bg-amber-600', lightBg: 'bg-amber-50/90', border: 'border-amber-200', text: 'text-amber-800' },
        { name: 'Kelompok 5', hex: '#8b5cf6', threeColor: 0x8b5cf6, badgeBg: 'bg-violet-600', lightBg: 'bg-violet-50/90', border: 'border-violet-200', text: 'text-violet-800' },
        { name: 'Kelompok 6', hex: '#ec4899', threeColor: 0xec4899, badgeBg: 'bg-pink-600', lightBg: 'bg-pink-50/90', border: 'border-pink-200', text: 'text-pink-800' },
        { name: 'Kelompok 7', hex: '#06b6d4', threeColor: 0x06b6d4, badgeBg: 'bg-cyan-600', lightBg: 'bg-cyan-50/90', border: 'border-cyan-200', text: 'text-cyan-800' },
        { name: 'Kelompok 8', hex: '#f97316', threeColor: 0xf97316, badgeBg: 'bg-orange-600', lightBg: 'bg-orange-50/90', border: 'border-orange-200', text: 'text-orange-800' }
    ];

    const OUTFIT_COLORS = [
        0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6,
        0xec4899, 0x06b6d4, 0xf97316, 0x14b8a6, 0x6366f1
    ];

    const SKIN_TONES = [
        0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0xfde2c4
    ];

    Object.assign(engine, { GROUP_PALETTE, OUTFIT_COLORS, SKIN_TONES });
}
