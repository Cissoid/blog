build: clean
	hugo

deploy: build
	cd public/ && \
	git init && \
	git remote add origin git@github.com:cissoid/cissoid.github.io && \
	git config user.name cissoid && \
	git config user.email yangtukun1412@gmail.com && \
	git add ./* && \
	git commit -m "Updated." && \
	git push -f origin master && \
	cd ..

clean:
	rm -rf public/
