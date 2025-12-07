/**
 * バッジの表示設定（ルートディレクトリ用とファイル用で個別に設定可能）
 */
export interface BadgeObject {
	root?: string; // エクスプローラーのフォルダ横に表示
	file?: string; // タブやファイル横に表示
}

/**
 * settings.json の "projectSettingsSync.mappings" 配列アイテムの定義
 */
export interface MappingItem {
	path: string; // 対象となるプロジェクトのパス (ルートからの相対パス)
	// stringなら両方に適用、BadgeObjectなら個別適用、undefinedなら表示なし
	badge?: string | BadgeObject;
}
