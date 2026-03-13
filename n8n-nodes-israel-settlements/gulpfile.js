const gulp = require('gulp');

gulp.task('build:icons', function() {
	return gulp.src('nodes/**/*.{png,svg,json}')
		.pipe(gulp.dest('dist/nodes'));
});
