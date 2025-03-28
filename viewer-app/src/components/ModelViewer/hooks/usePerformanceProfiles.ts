import { useState, useCallback, useMemo, useEffect } from "react";

// Performance settings
const MIN_DPR = 1;
const MAX_DPR = window.devicePixelRatio || 2;

// Check if deviceMemory is available
const hasDeviceMemory = "deviceMemory" in navigator;
const getDeviceMemory = (): number => {
	return hasDeviceMemory
		? (navigator as unknown as { deviceMemory: number }).deviceMemory
		: 4;
};

// Performance profiles for different rendering quality
export const PERFORMANCE_PROFILES = {
	high: {
		name: "Высокое качество",
		dpr: Math.min(2.5, window.devicePixelRatio || 1.5),
		shadows: true,
		shadowMapSize: 2048,
		antialias: true,
		physicallyCorrectLights: true,
		environment: "city",
		adaptiveDpr: false,
		gl: {
			powerPreference: "high-performance",
			precision: "highp",
			antialias: true,
			alpha: true,
		},
	},
	medium: {
		name: "Среднее качество",
		dpr: Math.min(1.25, window.devicePixelRatio || 1),
		shadows: true,
		shadowMapSize: 1024,
		antialias: true,
		physicallyCorrectLights: true,
		environment: "city",
		adaptiveDpr: false,
		gl: {
			powerPreference: "high-performance",
			precision: "mediump",
			antialias: true,
		},
	},
	low: {
		name: "Низкое качество",
		dpr: 0.75,
		shadows: false,
		antialias: false,
		physicallyCorrectLights: false,
		environment: "city",
		adaptiveDpr: false,
		pixelRatio: 0.75,
		gl: {
			powerPreference: "low-power",
			precision: "lowp",
			antialias: false,
			depth: false,
			stencil: false,
		},
	},
	auto: {
		name: "Автоматически",
		adaptiveDpr: true,
		adaptivePerformance: true,
		dpr:
			window.devicePixelRatio > 2
				? 1.5
				: window.devicePixelRatio > 1
					? window.devicePixelRatio
					: 1,
		shadows: navigator.hardwareConcurrency > 4,
		shadowMapSize: navigator.hardwareConcurrency > 6 ? 1024 : 512,
		antialias: getDeviceMemory() > 4 || navigator.hardwareConcurrency > 4,
		physicallyCorrectLights: navigator.hardwareConcurrency > 2,
		environment: "city",
		regress: true,
		gl: {
			powerPreference: "high-performance",
			precision: navigator.hardwareConcurrency > 4 ? "highp" : "mediump",
			antialias: getDeviceMemory() > 4 || navigator.hardwareConcurrency > 4,
			failIfMajorPerformanceCaveat: false,
		},
	},
};

export function usePerformanceProfiles() {
	const [activeProfile, setActiveProfile] = useState<string>("auto");
	const [dpr, setDpr] = useState<number>(
		PERFORMANCE_PROFILES.auto.dpr as number,
	);

	const adaptiveDprEnabled = useMemo(
		() =>
			PERFORMANCE_PROFILES[activeProfile as keyof typeof PERFORMANCE_PROFILES]
				.adaptiveDpr === true,
		[activeProfile],
	);

	const handlePerformanceChange = useCallback(
		(increase: boolean) => {
			if (adaptiveDprEnabled) {
				setDpr((prevDpr) => {
					if (increase) {
						return Math.min(prevDpr + 0.25, MAX_DPR);
					}
					return Math.max(prevDpr - 0.25, MIN_DPR);
				});
			}
		},
		[adaptiveDprEnabled],
	);

	useEffect(() => {
		const profile =
			PERFORMANCE_PROFILES[activeProfile as keyof typeof PERFORMANCE_PROFILES];
		if (profile?.dpr) {
			setDpr(profile.dpr as number);
		}
	}, [activeProfile]);

	return {
		profiles: PERFORMANCE_PROFILES,
		activeProfile,
		setActiveProfile,
		dpr,
		setDpr,
		adaptiveDprEnabled,
		handlePerformanceChange,
	};
}
